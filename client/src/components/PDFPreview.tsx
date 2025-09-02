
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw, X, RefreshCw } from 'lucide-react';
import { TransformationRule } from '../types';
import { generateLivePreview } from '../services/api';

// Use the correct worker version that matches the installed pdfjs-dist (3.11.174)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PDFPreviewProps {
  fileId: string;
  fileName?: string;
  onClose: () => void;
  onDownload: () => void;
  // Optional: when provided, will show live preview with transformations
  transformations?: TransformationRule[];
  // Optional: when true, will use uploaded file instead of transformed preview
  showOriginal?: boolean;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  fileId,
  fileName,
  onClose,
  onDownload,
  transformations = [],
  showOriginal = false
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [showOriginalState, setShowOriginalState] = useState<boolean>(showOriginal);

  // Determine which URL to use for the PDF
  const getPreviewUrl = useCallback(() => {
    console.log('🔗 getPreviewUrl called:');
    console.log('  - showOriginalState:', showOriginalState);
    console.log('  - transformations.length:', transformations.length);
    console.log('  - livePreviewUrl:', livePreviewUrl);
    console.log('  - fileId:', fileId);
    console.log('  - showOriginal prop:', showOriginal);
    
    // If we have transformations defined (live preview mode)
    if (transformations.length > 0) {
      // If showOriginalState is true, show original
      if (showOriginalState) {
        const originalUrl = `${API_BASE_URL.replace('/api', '')}/api/preview/upload/${fileId}`;
        console.log('  → Using original URL (showOriginalState=true):', originalUrl);
        return originalUrl;
      } 
      // If we have live preview URL (generated from transformations), use it
      else if (livePreviewUrl) {
        console.log('  → Using live preview URL:', livePreviewUrl);
        return livePreviewUrl;
      } 
      // If we have transformations but no live preview yet, show original while generating
      else {
        const originalUrl = `${API_BASE_URL.replace('/api', '')}/api/preview/upload/${fileId}`;
        console.log('  → Using original URL (transformations pending):', originalUrl);
        return originalUrl;
      }
    } 
    // No transformations passed - distinguish between original file and transformed result
    else {
      // If showOriginal prop is true, this is definitely an original file preview
      if (showOriginal) {
        const originalUrl = `${API_BASE_URL.replace('/api', '')}/api/preview/upload/${fileId}`;
        console.log('  → Using original URL (showOriginal prop=true):', originalUrl);
        return originalUrl;
      }
      // Otherwise, this is a transformed result preview (fileId is actually a previewId)
      else {
        const transformedUrl = `${API_BASE_URL}/preview/${fileId}`;
        console.log('  → Using transformed URL (transformed result):', transformedUrl);
        return transformedUrl;
      }
    }
  }, [fileId, showOriginalState, transformations.length, livePreviewUrl, showOriginal]);

  // Generate live preview when transformations change
  useEffect(() => {
    console.log('🔍 PDFPreview useEffect triggered:');
    console.log('  - showOriginal:', showOriginal);
    console.log('  - transformations.length:', transformations.length);
    console.log('  - transformations:', transformations);
    console.log('  - fileId:', fileId);

    if (!showOriginal && transformations.length > 0) {
      console.log('🚀 Generating live preview...');
      
      // Clean up previous preview URL if it exists
      if (livePreviewUrl) {
        URL.revokeObjectURL(livePreviewUrl);
        setLivePreviewUrl(null);
      }
      
      setIsGeneratingPreview(true);
      generateLivePreview(fileId, transformations)
        .then((url) => {
          console.log('✅ Live preview URL generated:', url);
          if (url) {
            setLivePreviewUrl(url);
            setError(null);
          } else {
            setError('Failed to generate PDF preview.');
          }
        })
        .catch(async (error) => {
          // Try to extract backend error message if available
          let errorMsg = 'Failed to generate PDF preview.';
          if (error && error.response) {
            try {
              const data = await error.response.json();
              if (data && data.error) errorMsg = data.error + (data.details ? `: ${data.details}` : '');
            } catch {}
          }
          setError(errorMsg);
          console.error('❌ Failed to generate live preview:', error);
        })
        .finally(() => {
          setIsGeneratingPreview(false);
        });
    }
  }, [fileId, transformations, showOriginalState]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (livePreviewUrl) {
        URL.revokeObjectURL(livePreviewUrl);
      }
    };
  }, [livePreviewUrl]);

  const pdfUrl = getPreviewUrl();

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    // Only reset page if current page is out of range
    setPageNumber(prev => prev > numPages ? 1 : prev);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF loading error:', error);
    setError('Failed to load PDF preview');
  }, []);

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const refreshPreview = () => {
    if (transformations.length > 0) {
      setIsGeneratingPreview(true);
      generateLivePreview(fileId, transformations)
        .then((url) => {
          if (url) {
            // Clean up previous URL
            if (livePreviewUrl) {
              URL.revokeObjectURL(livePreviewUrl);
            }
            setLivePreviewUrl(url);
          }
        })
        .catch((error) => {
          console.error('Failed to refresh preview:', error);
        })
        .finally(() => {
          setIsGeneratingPreview(false);
        });
    }
  };

  const truncateFileName = (fileName: string, maxLength: number = 40): string => {
    if (fileName.length <= maxLength) return fileName;
    
    // Extract file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    
    // Calculate how much space we have for the name part
    const availableLength = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableLength <= 0) {
      return fileName.substring(0, maxLength - 3) + '...';
    }
    
    return nameWithoutExt.substring(0, availableLength) + '...' + extension;
  };

  console.log('PDFPreview rendering with fileId:', fileId, 'pdfUrl:', pdfUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-gray-900">PDF Preview</h2>
              {isGeneratingPreview && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating preview...</span>
                </div>
              )}
              {!showOriginalState && transformations.length > 0 && !isGeneratingPreview && (
                <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Live Preview
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {fileId && transformations.length > 0 && (
              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showOriginalState}
                    onChange={(e) => setShowOriginalState(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-primary-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Original</span>
                </label>
              </div>
            )}
            <button
              onClick={onClose}
              className="btn-ghost p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div> {/* <-- Add this closing div for the header left section */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium px-3 py-1 bg-white rounded border">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom and Rotation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="btn-ghost btn-sm disabled:opacity-50"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium px-2 py-1 bg-white rounded border min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="btn-ghost btn-sm disabled:opacity-50"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button
              onClick={rotateClockwise}
              className="btn-ghost btn-sm"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex justify-center">
            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="h-8 w-8 text-error-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Error</h3>
                  <p className="text-gray-600">{error}</p>
                </div>
              </div>
            )}

            {!error && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Loading PDF...</span>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    </div>
                  }
                  className="shadow-lg"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            )}
          </div>
        </div>

        {/* Footer with Page Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Go to page:
            </label>
            <input
              type="number"
              min="1"
              max={numPages}
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= numPages) {
                  setPageNumber(page);
                }
              }}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
            />
            <span className="text-sm text-gray-500">
              of {numPages}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}