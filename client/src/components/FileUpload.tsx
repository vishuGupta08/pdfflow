import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadedFile } from '../types';
import { ApiService } from '../services/api';

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  uploadedFile: UploadedFile | null;
  onFileRemove: () => void;
  isUploading: boolean;
  uploadError: string | null;
  setIsUploading: (uploading: boolean) => void;
  setUploadError: (error: string | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  uploadedFile,
  onFileRemove,
  isUploading,
  uploadError,
  setIsUploading,
  setUploadError
}) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const response = await ApiService.uploadFile(file);
      
      if (response.success && response.data) {
        onFileUpload(response.data);
      } else {
        setUploadError(response.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, setIsUploading, setUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isUploading || !!uploadedFile
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (uploadedFile) {
    return (
      <div className="card animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-success-100 to-success-50 rounded-xl">
              <FileText className="h-8 w-8 text-success-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900">{uploadedFile.originalName}</h3>
                <CheckCircle className="h-4 w-4 text-success-500" />
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <span>📄</span>
                  <span>{formatFileSize(uploadedFile.size)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span>📅</span>
                  <span>Uploaded {formatDate(uploadedFile.uploadedAt)}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onFileRemove}
            className="btn-ghost p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
            title="Remove file"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          upload-zone
          ${isDragActive ? 'upload-zone-active' : ''}
          ${isUploading ? 'upload-zone-disabled' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-6">
          {/* Upload Icon */}
          <div className={`
            mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragActive 
              ? 'bg-gradient-to-r from-primary-500 to-primary-400 scale-110' 
              : 'bg-gradient-to-r from-gray-100 to-gray-50 hover:from-primary-100 hover:to-primary-50'
            }
          `}>
            <Upload className={`
              h-8 w-8 transition-all duration-300
              ${isDragActive ? 'text-white animate-bounce-soft' : 'text-gray-600'}
            `} />
          </div>
          
          {/* Upload Status */}
          {isUploading ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Uploading your PDF...</h3>
                <p className="text-sm text-gray-600">Please wait while we process your file</p>
              </div>
              <div className="progress-bar max-w-xs mx-auto">
                <div className="progress-fill w-full animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">
                {isDragActive ? 'Drop your PDF here!' : 'Upload a PDF file'}
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                {isDragActive 
                  ? 'Release to upload your file' 
                  : 'Drag and drop your PDF file here, or click to browse and select a file'
                }
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <span>📄</span>
                  <span>PDF only</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>📏</span>
                  <span>Max 50MB</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🔒</span>
                  <span>Secure</span>
                </div>
              </div>
              {!isDragActive && (
                <button
                  type="button"
                  className="btn-primary btn-sm mt-4"
                  onClick={() => {/* Click is handled by dropzone */}}
                >
                  Choose File
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {uploadError && (
        <div className="card status-error animate-slide-up">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-error-800">Upload Failed</h4>
              <p className="text-sm text-error-600 mt-1">{uploadError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 