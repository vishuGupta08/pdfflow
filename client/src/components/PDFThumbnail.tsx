import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Eye, AlertTriangle } from 'lucide-react';

// Use the correct worker version that matches the installed pdfjs-dist (3.11.174)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PDFThumbnailProps {
  fileId: string;
  fileName?: string;
  className?: string;
}

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({
  fileId,
  fileName,
  className = ''
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const truncateFileName = (fileName: string, maxLength: number = 25): string => {
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

  // For uploaded files, we need to construct the correct preview URL
  // The server has an upload endpoint that serves uploaded files for preview
  const pdfUrl = `${API_BASE_URL}/upload/preview/${fileId}`;

  const onDocumentLoadSuccess = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF thumbnail loading error:', error);
    setLoading(false);
    setError('Failed to load preview');
  }, []);

  const onPageLoadError = useCallback((error: Error) => {
    console.error('PDF page loading error:', error);
    setError('Failed to load page');
  }, []);

  return (
    <div className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Preview</span>
        </div>
      </div>

      {/* Thumbnail Content */}
      <div className="relative h-48 flex items-center justify-center bg-gray-50">
        {loading && (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-sm text-gray-500">Loading preview...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center space-y-2 text-center px-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Preview unavailable</p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!error && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null} // We handle loading state above
          >
            <Page
              pageNumber={1}
              scale={0.3} // Small scale for thumbnail
              loading={null} // We handle loading state above
              onLoadError={onPageLoadError}
              className="drop-shadow-sm"
              renderTextLayer={false} // Disable text layer for performance
              renderAnnotationLayer={false} // Disable annotation layer for performance
            />
          </Document>
        )}
      </div>

      {/* Footer with file info */}
      {fileName && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <FileText className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600" title={fileName}>
              {truncateFileName(fileName)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
