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

  const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (fileName.length <= maxLength) return fileName;
    
    // Extract file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    
    // Calculate how much space we have for the name part
    const availableLength = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableLength <= 0) {
      // If even the extension is too long, just truncate everything
      return fileName.substring(0, maxLength - 3) + '...';
    }
    
    // Truncate the name part and add ellipsis
    return nameWithoutExt.substring(0, availableLength) + '...' + extension;
  };

  if (uploadedFile) {
    return (
      <div className="space-y-6">
        {/* Enhanced File info card with glassmorphism */}
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-6 animate-scale-in hover:shadow-3xl transition-all duration-500 group">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-success-50/50 via-transparent to-primary-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Enhanced file icon with animation */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-success-400 to-success-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative p-4 bg-gradient-to-br from-success-100 via-success-50 to-white rounded-2xl border border-success-200/50 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-10 w-10 text-success-600 group-hover:text-success-700 transition-colors duration-300" />
                  {/* Success indicator with pulse animation */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white animate-pulse shadow-lg">
                    <CheckCircle className="h-3 w-3 text-white absolute inset-0.5" />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center space-x-3">
                  <h3 
                    className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-primary-800 group-hover:to-primary-600 transition-all duration-300 cursor-pointer" 
                    title={uploadedFile.originalName}
                  >
                    {truncateFileName(uploadedFile.originalName)}
                  </h3>
                  <div className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200/50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Uploaded</span>
                  </div>
                </div>
                
                {/* Enhanced file details with icons */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-white/60 rounded-xl border border-gray-200/50 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-gray-700">{formatFileSize(uploadedFile.size)}</span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-2 bg-white/60 rounded-xl border border-gray-200/50 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="font-medium text-gray-700">Uploaded {formatDate(uploadedFile.uploadedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced remove button */}
            <button
              onClick={onFileRemove}
              className="group/btn relative p-3 bg-white/80 hover:bg-red-50 border border-gray-200/50 hover:border-red-200 rounded-xl transition-all duration-300 backdrop-blur-sm hover:shadow-lg"
              title="Remove file"
            >
              <X className="h-5 w-5 text-gray-400 group-hover/btn:text-red-500 transition-colors duration-300" />
              <div className="absolute inset-0 bg-red-500/10 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        {/* Enhanced PDF Preview Thumbnail with better styling */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
            <div className="relative">
              <PDFThumbnail 
                fileId={uploadedFile.fileId} 
                fileName={uploadedFile.originalName}
                className="w-72 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/80 hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden bg-white/50 backdrop-blur-xl border-2 border-dashed rounded-3xl p-12 transition-all duration-500 cursor-pointer group
          ${isDragActive 
            ? 'border-primary-400 bg-gradient-to-br from-primary-50/80 to-primary-100/60 scale-105 shadow-2xl' 
            : 'border-gray-200 hover:border-primary-300 hover:bg-gradient-to-br hover:from-primary-25/50 hover:to-white hover:shadow-xl'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Animated background effects */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-4 left-4 w-2 h-2 bg-primary-400 rounded-full animate-ping"></div>
          <div className="absolute top-8 right-6 w-1 h-1 bg-purple-400 rounded-full animate-ping delay-300"></div>
          <div className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping delay-700"></div>
        </div>
        
        <div className="relative space-y-8">
          {/* Enhanced Upload Icon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            {/* Glow effect */}
            <div className={`
              absolute inset-0 rounded-3xl transition-all duration-500
              ${isDragActive 
                ? 'bg-gradient-to-r from-primary-400 to-primary-600 blur-2xl opacity-60 scale-110' 
                : 'bg-gradient-to-r from-gray-200 to-gray-300 blur-xl opacity-30 group-hover:from-primary-300 group-hover:to-primary-500 group-hover:opacity-50'
              }
            `}></div>
            
            {/* Icon container */}
            <div className={`
              relative w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500 border-2
              ${isDragActive 
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-300 scale-110 rotate-12' 
                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50 group-hover:bg-gradient-to-br group-hover:from-primary-50 group-hover:to-primary-100 group-hover:border-primary-200 group-hover:scale-110 group-hover:rotate-6'
              }
            `}>
              <Upload className={`
                h-12 w-12 transition-all duration-500
                ${isDragActive 
                  ? 'text-white animate-bounce scale-110' 
                  : 'text-gray-600 group-hover:text-primary-600 group-hover:scale-110'
                }
              `} />
            </div>
          </div>
          
          {/* Enhanced Upload Status */}
          {isUploading ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="relative">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                    Uploading your PDF...
                  </h3>
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg blur opacity-25 animate-pulse"></div>
                </div>
                
                <p className="text-gray-600 text-lg">
                  {uploadProgress.progress < 100 
                    ? 'Please wait while we process your file with care' 
                    : '✨ Almost done! Preparing your document...'
                  }
                </p>
                
                {uploadProgress.progress < 95 && (
                  <button
                    onClick={handleCancelUpload}
                    className="group inline-flex items-center space-x-2 px-4 py-2 text-sm text-gray-500 hover:text-red-500 bg-white/80 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-200 backdrop-blur-sm transition-all duration-300"
                  >
                    <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Cancel Upload</span>
                  </button>
                )}
              </div>
              
              {/* Revolutionary Progress Bar */}
              <div className="max-w-lg mx-auto space-y-4">
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
                  
                  {/* Progress container */}
                  <div className="relative h-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/30 overflow-hidden shadow-2xl">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 transition-all duration-500 ease-out relative overflow-hidden rounded-2xl"
                      style={{ width: `${uploadProgress.progress}%` }}
                    >
                      {/* Multiple animated shine effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                      
                      {/* Progress dots animation */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        <div className="w-1 h-1 bg-white/80 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                    
                    {/* Percentage display */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white drop-shadow-lg">
                        {Math.round(uploadProgress.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Upload Stats */}
                <div className={`grid grid-cols-2 gap-4 upload-stats ${
                  uploadProgress.progress > 0 ? 'upload-stats-fade-in' : ''
                }`}>
                  <div className="flex items-center justify-center space-x-2 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-800">{formatSpeed(uploadProgress.speed)}</div>
                      <div className="text-xs text-gray-500">Speed</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30">
                    {uploadProgress.progress >= 95 ? (
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-700">Finalizing...</div>
                          <div className="text-xs text-green-500">Almost there!</div>
                        </div>
                      </div>
                    ) : uploadProgress.timeRemaining > 0 ? (
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-800">{formatTime(uploadProgress.timeRemaining)}</div>
                          <div className="text-xs text-gray-500">Remaining</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-800">--</div>
                          <div className="text-xs text-gray-500">Calculating</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* File size progress */}
                <div className="text-center p-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-lg font-bold text-gray-800">
                    {formatFileSize(uploadProgress.loaded)} <span className="text-gray-500 font-normal">of</span> {formatFileSize(uploadProgress.total)}
                  </div>
                  <div className="text-sm text-gray-600">Uploaded</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="space-y-3">
                <h3 className="text-3xl font-bold">
                  <span className={`transition-all duration-500 ${
                    isDragActive 
                      ? 'bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent' 
                      : 'bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-primary-700 group-hover:to-primary-900'
                  }`}>
                    {isDragActive ? '🎯 Drop your PDF here!' : '📄 Upload a PDF file'}
                  </span>
                </h3>
                
                <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                  {isDragActive 
                    ? 'Release to upload your file and start transforming!' 
                    : 'Drag and drop your PDF file here, or click to browse and select a file for processing'
                  }
                </p>
              </div>
              
              {/* Enhanced feature badges */}
              <div className="flex items-center justify-center space-x-8">
                <div className="group/badge flex items-center space-x-2 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full group-hover/badge:scale-110 transition-transform duration-300"></div>
                  <span className="text-sm font-semibold text-gray-700 group-hover/badge:text-blue-700 transition-colors duration-300">PDF only</span>
                </div>
                
                <div className="group/badge flex items-center space-x-2 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-green-300 hover:bg-green-50/50 transition-all duration-300">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full group-hover/badge:scale-110 transition-transform duration-300"></div>
                  <span className="text-sm font-semibold text-gray-700 group-hover/badge:text-green-700 transition-colors duration-300">Max 50MB</span>
                </div>
                
                <div className="group/badge flex items-center space-x-2 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-300">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full group-hover/badge:scale-110 transition-transform duration-300"></div>
                  <span className="text-sm font-semibold text-gray-700 group-hover/badge:text-purple-700 transition-colors duration-300">🔒 Secure</span>
                </div>
              </div>
              
              {!isDragActive && (
                <div className="pt-4">
                  <button
                    type="button"
                    className="group/cta relative inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary-300/50"
                    onClick={() => {/* Click is handled by dropzone */}}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-500 rounded-2xl blur-xl opacity-30 group-hover/cta:opacity-50 transition-opacity duration-300"></div>
                    <Upload className="h-6 w-6 group-hover/cta:scale-110 group-hover/cta:rotate-12 transition-transform duration-300" />
                    <span className="relative">Choose File</span>
                    <div className="relative w-2 h-2 bg-white/80 rounded-full group-hover/cta:animate-ping"></div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Error Message */}
      {uploadError && (
        <div className="relative overflow-hidden bg-red-50/80 backdrop-blur-xl border border-red-200/50 rounded-2xl p-6 animate-slide-up shadow-xl">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
            <div className="absolute bottom-6 left-6 w-1 h-1 bg-red-500 rounded-full animate-ping delay-500"></div>
          </div>
          
          <div className="relative flex items-start space-x-4">
            {/* Enhanced error icon */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-xl font-bold text-red-800 mb-2">Upload Failed</h4>
                <p className="text-red-700 leading-relaxed">{uploadError}</p>
              </div>
              
              {/* Enhanced helpful tips */}
              {uploadError.includes('50MB') && (
                <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-red-200/50">
                  <p className="font-semibold text-red-800 mb-3 flex items-center space-x-2">
                    <span>💡</span>
                    <span>Tips to reduce file size:</span>
                  </p>
                  <ul className="space-y-2 text-red-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span>Use PDF compression tools</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span>Remove unnecessary images or pages</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span>Consider upgrading for larger file support</span>
                    </li>
                  </ul>
                </div>
              )}
              
              {uploadError.includes('limit') && uploadError.includes('plan') && (
                <div className="p-4 bg-gradient-to-r from-primary-50/80 to-primary-100/60 backdrop-blur-sm rounded-xl border border-primary-200/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">⭐</span>
                    </div>
                    <div>
                      <p className="font-bold text-primary-800 text-lg">Upgrade to Pro</p>
                      <p className="text-primary-700">Get unlimited uploads, larger file sizes, and premium features.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 