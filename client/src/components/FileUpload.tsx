import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { UploadedFile } from '../types';
import { ApiService, UploadProgress } from '../services/api';
import { PDFThumbnail } from './PDFThumbnail';

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    speed: 0,
    timeRemaining: 0,
    loaded: 0,
    total: 0
  });
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const controller = new AbortController();
    
    setIsUploading(true);
    setUploadError(null);
    setAbortController(controller);
    setUploadProgress({
      progress: 0,
      speed: 0,
      timeRemaining: 0,
      loaded: 0,
      total: file.size
    });
    
    try {
      const response = await ApiService.uploadFileWithProgress(file, (progress) => {
        setUploadProgress(progress);
      }, controller.signal);
      
      if (response.success && response.data) {
        // Show completed progress briefly before transitioning
        setUploadProgress(prev => ({ ...prev, progress: 100 }));
        setTimeout(() => {
          onFileUpload(response.data!);
        }, 500);
      } else {
        // Handle specific error types
        let errorMessage = response.error || 'Upload failed';
        
        if (response.errorType === 'FILE_SIZE_LIMIT') {
          errorMessage = `File size exceeds the limit. Please upload a PDF smaller than 50MB. Your file is ${formatFileSize(file.size)}.`;
        } else if (response.errorType === 'AUTH_REQUIRED') {
          errorMessage = 'Please sign in to upload files.';
        } else if (response.errorType === 'USAGE_LIMIT') {
          if (response.limitInfo?.upgrade_required) {
            errorMessage = `Monthly upload limit exceeded for ${response.limitInfo.current_plan} plan. Please upgrade to continue.`;
          } else {
            errorMessage = 'Upload limit reached. Please try again later or upgrade your plan.';
          }
        }
        
        setUploadError(errorMessage);
      }
    } catch (error) {
      let errorMessage = 'Upload failed';
      
      if (error instanceof Error) {
        if (error.message.includes('413') || error.message.includes('too large')) {
          errorMessage = `File size exceeds the limit. Please upload a PDF smaller than 50MB. Your file is ${formatFileSize(file.size)}.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      setAbortController(null);
    }
      }, [onFileUpload, setIsUploading, setUploadError]);

  const handleCancelUpload = () => {
    if (abortController) {
      abortController.abort();
      setIsUploading(false);
      setAbortController(null);
      setUploadError('Upload cancelled');
    }
  };

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
    const value = (bytes / Math.pow(k, i));
    return value.toFixed(2) + ' ' + sizes[i];
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
      <div className="space-y-4">
        {/* File info card */}
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

        {/* PDF Preview Thumbnail */}
        <div className="flex justify-center">
          <PDFThumbnail 
            fileId={uploadedFile.fileId} 
            fileName={uploadedFile.originalName}
            className="w-64"
          />
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
                <p className="text-sm text-gray-600">
                  {uploadProgress.progress < 100 ? 'Please wait while we process your file' : 'Almost done...'}
                </p>
                {uploadProgress.progress < 95 && (
                  <button
                    onClick={handleCancelUpload}
                    className="mt-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Cancel Upload
                  </button>
                )}
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="max-w-md mx-auto space-y-3">
                <div className="relative">
                  <div className="progress-bar h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300 ease-out relative overflow-hidden"
                      style={{ width: `${uploadProgress.progress}%` }}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-700 mix-blend-difference">
                      {Math.round(uploadProgress.progress)}%
                    </span>
                  </div>
                </div>
                
                {/* Upload Stats */}
                <div className={`flex items-center justify-between text-xs text-gray-500 upload-stats ${
                  uploadProgress.progress > 0 ? 'upload-stats-fade-in' : ''
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Zap className={`h-3 w-3 ${uploadProgress.speed > 0 ? 'text-primary-500' : ''}`} />
                      <span>{formatSpeed(uploadProgress.speed)}</span>
                    </div>
                    {uploadProgress.timeRemaining > 0 && uploadProgress.progress < 95 && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>{formatTime(uploadProgress.timeRemaining)}</span>
                      </div>
                    )}
                    {uploadProgress.progress >= 95 && (
                      <div className="flex items-center space-x-1 text-success-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Finalizing...</span>
                      </div>
                    )}
                  </div>
                  <div className="font-medium">
                    {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
                  </div>
                </div>
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
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-error-800 mb-1">Upload Failed</h4>
              <p className="text-sm text-error-600">{uploadError}</p>
              
              {/* Show helpful tips based on error type */}
              {uploadError.includes('50MB') && (
                <div className="mt-2 text-xs text-error-500">
                  <p className="font-medium mb-1">Tips to reduce file size:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Use PDF compression tools</li>
                    <li>Remove unnecessary images or pages</li>
                    <li>Consider upgrading for larger file support</li>
                  </ul>
                </div>
              )}
              
              {uploadError.includes('limit') && uploadError.includes('plan') && (
                <div className="mt-2 p-2 bg-primary-50 border border-primary-200 rounded text-xs">
                  <p className="text-primary-700">
                    <strong>Upgrade to Pro:</strong> Get unlimited uploads, larger file sizes, and premium features.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 