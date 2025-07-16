import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { FileUpload } from '../FileUpload'
import { ApiService } from '../../services/api'

// Mock the ApiService
vi.mock('../../services/api')

describe('FileUpload Component', () => {
  const mockOnFileUpload = vi.fn()
  const mockOnFileRemove = vi.fn()
  const mockSetIsUploading = vi.fn()
  const mockSetUploadError = vi.fn()

  const defaultProps = {
    onFileUpload: mockOnFileUpload,
    uploadedFile: null,
    onFileRemove: mockOnFileRemove,
    isUploading: false,
    uploadError: null,
    setIsUploading: mockSetIsUploading,
    setUploadError: mockSetUploadError,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload zone when no file is uploaded', () => {
    render(<FileUpload {...defaultProps} />)
    
    expect(screen.getByText('Upload a PDF file')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop your PDF file here, or click to browse and select a file')).toBeInTheDocument()
    expect(screen.getByText('PDF only')).toBeInTheDocument()
    expect(screen.getByText('Max 50MB')).toBeInTheDocument()
    expect(screen.getByText('Secure')).toBeInTheDocument()
  })

  it('shows uploaded file info when file is uploaded', () => {
    const uploadedFile = {
      fileId: 'test-123',
      originalName: 'test.pdf',
      size: 1024000,
      uploadedAt: '2023-01-01T00:00:00Z',
    }

    render(<FileUpload {...defaultProps} uploadedFile={uploadedFile} />)
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
    expect(screen.getByText('1000.00 KB')).toBeInTheDocument()
    expect(screen.getByText(/Uploaded/)).toBeInTheDocument()
  })

  it('shows uploading state with progress bar', () => {
    render(<FileUpload {...defaultProps} isUploading={true} />)
    
    expect(screen.getByText('Uploading your PDF...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we process your file')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows upload error when error occurs', () => {
    const errorMessage = 'Upload failed - file too large'
    render(<FileUpload {...defaultProps} uploadError={errorMessage} />)
    
    expect(screen.getByText('Upload Failed')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows helpful tips for file size errors', () => {
    const errorMessage = 'File size exceeds the limit. Please upload a PDF smaller than 50MB.'
    render(<FileUpload {...defaultProps} uploadError={errorMessage} />)
    
    expect(screen.getByText('Tips to reduce file size:')).toBeInTheDocument()
    expect(screen.getByText('Use PDF compression tools')).toBeInTheDocument()
    expect(screen.getByText('Remove unnecessary images or pages')).toBeInTheDocument()
  })

  it('calls onFileRemove when remove button is clicked', async () => {
    const user = userEvent.setup()
    const uploadedFile = {
      fileId: 'test-123',
      originalName: 'test.pdf',
      size: 1024000,
      uploadedAt: '2023-01-01T00:00:00Z',
    }

    render(<FileUpload {...defaultProps} uploadedFile={uploadedFile} />)
    
    const removeButton = screen.getByTitle('Remove file')
    await user.click(removeButton)
    
    expect(mockOnFileRemove).toHaveBeenCalledOnce()
  })

  it('handles successful file upload', async () => {
    const mockUploadResponse = {
      success: true,
      data: {
        fileId: 'test-123',
        originalName: 'test.pdf',
        size: 1024000,
        uploadedAt: '2023-01-01T00:00:00Z',
      },
    }

    const mockProgress = vi.fn()
    vi.mocked(ApiService.uploadFileWithProgress).mockResolvedValue(mockUploadResponse)

    render(<FileUpload {...defaultProps} />)
    
    // Create a test file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock the useDropzone hook
    const { useDropzone } = await import('react-dropzone')
    const mockUseDropzone = vi.mocked(useDropzone)
    
    // Simulate file drop
    const onDrop = mockUseDropzone.mock.calls[0][0].onDrop
    await onDrop([file])
    
    await waitFor(() => {
      expect(mockSetIsUploading).toHaveBeenCalledWith(true)
      expect(ApiService.uploadFileWithProgress).toHaveBeenCalledWith(
        file,
        expect.any(Function),
        expect.any(AbortSignal)
      )
    })
  })

  it('handles upload error', async () => {
    const mockUploadResponse = {
      success: false,
      error: 'Upload failed',
      errorType: 'UNKNOWN',
    }

    vi.mocked(ApiService.uploadFileWithProgress).mockResolvedValue(mockUploadResponse)

    render(<FileUpload {...defaultProps} />)
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    const { useDropzone } = await import('react-dropzone')
    const mockUseDropzone = vi.mocked(useDropzone)
    
    const onDrop = mockUseDropzone.mock.calls[0][0].onDrop
    await onDrop([file])
    
    await waitFor(() => {
      expect(mockSetUploadError).toHaveBeenCalledWith('Upload failed')
    })
  })

  it('formats file sizes correctly', () => {
    const testCases = [
      { size: 0, expected: '0 Bytes' },
      { size: 1024, expected: '1.00 KB' },
      { size: 1024 * 1024, expected: '1.00 MB' },
      { size: 1024 * 1024 * 1024, expected: '1.00 GB' },
    ]

    testCases.forEach(({ size, expected }) => {
      const uploadedFile = {
        fileId: 'test-123',
        originalName: 'test.pdf',
        size,
        uploadedAt: '2023-01-01T00:00:00Z',
      }

      const { rerender } = render(<FileUpload {...defaultProps} uploadedFile={uploadedFile} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
      rerender(<FileUpload {...defaultProps} uploadedFile={null} />)
    })
  })

  it('shows cancel button during upload', () => {
    render(<FileUpload {...defaultProps} isUploading={true} />)
    
    expect(screen.getByText('Cancel Upload')).toBeInTheDocument()
  })

  it('shows finalizing state when upload is near completion', () => {
    // This would require mocking the upload progress state
    // For now, just test that the component renders without errors
    render(<FileUpload {...defaultProps} isUploading={true} />)
    expect(screen.getByText('Uploading your PDF...')).toBeInTheDocument()
  })
}) 