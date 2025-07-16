import { UploadedFile, TransformationRule, ApiResponse } from '../types/index';

export interface LimitInfo {
  upgrade_required?: boolean;
  current_plan?: string;
  usage?: {
    transformations: number;
    apiCalls: number;
    storageUsed: number;
  };
  maxTransformations?: number;
  maxFileSize?: number;
}

export interface TransformResult {
  success: boolean;
  downloadId?: string;
  previewId?: string;
  fileName?: string;
  error?: string;
  errorType?: 'FILE_SIZE_LIMIT' | 'USAGE_LIMIT' | 'AUTH_REQUIRED' | 'UNKNOWN';
  limitInfo?: LimitInfo;
}

export interface ExtendedApiResponse<T> extends ApiResponse<T> {
  errorType?: string;
  limitInfo?: LimitInfo;
}

export interface UploadProgress {
  progress: number;
  speed: number;
  timeRemaining: number;
  loaded: number;
  total: number;
}

interface TransformApiResponse {
  success: boolean;
  message: string;
  downloadId: string;
  previewId: string;
  fileName: string;
}

// Helper function to handle API responses with proper error parsing
async function handleApiResponse<T>(response: Response): Promise<ExtendedApiResponse<T>> {
  const data = await response.json();
  
  // Handle different HTTP status codes
  if (!response.ok) {
    let errorType = 'UNKNOWN';
    let limitInfo: LimitInfo | undefined = undefined;
    
    switch (response.status) {
      case 413: // Payload too large (file size)
        errorType = 'FILE_SIZE_LIMIT';
        break;
      case 429: // Too many requests (usage limit)
        errorType = 'USAGE_LIMIT';
        limitInfo = {
          upgrade_required: data.upgrade_required,
          current_plan: data.current_plan,
          usage: data.usage
        };
        break;
      case 401:
      case 403:
        errorType = 'AUTH_REQUIRED';
        break;
      case 400:
        // Check if it's a multer file size error
        if (data.error && data.error.toLowerCase().includes('file') && data.error.toLowerCase().includes('size')) {
          errorType = 'FILE_SIZE_LIMIT';
        }
        break;
    }
    
    return {
      success: false,
      error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      errorType,
      limitInfo
    };
  }
  
  return data;
}

// Use environment variable for API base URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const editPDF = async (
  fileId: string,
  edits: any[]
): Promise<TransformResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        edits
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        downloadId: data.downloadId,
        previewId: data.previewId,
        fileName: data.fileName,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Edit failed'
      };
    }
  } catch (error) {
    console.error('PDF edit error:', error);
    return {
      success: false,
      error: 'Network error occurred'
    };
  }
};

export const transformPDF = async (
  fileId: string,
  transformations: TransformationRule[]
): Promise<TransformResult> => {
  try {
    // Remove the 'id' field from transformation rules before sending to API
    // The 'id' field is only used for UI purposes and backend doesn't allow it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const transformationsWithoutId = transformations.map(({ id: _id, ...rule }) => rule);
    
    const response = await fetch(`${API_BASE_URL}/transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        transformations: transformationsWithoutId,
      }),
    });

    const data = await handleApiResponse<{downloadId: string; previewId: string; fileName: string}>(response);
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Transformation failed',
        errorType: data.errorType as TransformResult['errorType'],
        limitInfo: data.limitInfo
      };
    }

    return {
      success: true,
      downloadId: (data as TransformApiResponse).downloadId,
      previewId: (data as TransformApiResponse).previewId,
      fileName: (data as TransformApiResponse).fileName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
      errorType: 'UNKNOWN'
    };
  }
};

export class ApiService {
  static async uploadFile(file: File): Promise<ExtendedApiResponse<UploadedFile>> {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    return handleApiResponse<UploadedFile>(response);
  }

  static async uploadFileWithProgress(
    file: File, 
    onProgress: (progress: UploadProgress) => void,
    signal?: AbortSignal
  ): Promise<ExtendedApiResponse<UploadedFile>> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('pdf', file);

      let startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000; // Convert to seconds
          const loadedDiff = event.loaded - lastLoaded;
          
          // Calculate speed (bytes per second)
          const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
          
          // Calculate time remaining
          const remainingBytes = event.total - event.loaded;
          const timeRemaining = speed > 0 ? remainingBytes / speed : 0;
          
          const progress: UploadProgress = {
            progress: (event.loaded / event.total) * 100,
            speed: speed,
            timeRemaining: timeRemaining,
            loaded: event.loaded,
            total: event.total
          };
          
          onProgress(progress);
          
          // Update for next calculation
          lastLoaded = event.loaded;
          lastTime = now;
        }
      });

      xhr.addEventListener('load', async () => {
        try {
          const responseText = xhr.responseText;
          const data = JSON.parse(responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              data: data.data,
            });
          } else {
            // Handle error response
            let errorType = 'UNKNOWN';
            let limitInfo: LimitInfo | undefined = undefined;
            
            switch (xhr.status) {
              case 413:
                errorType = 'FILE_SIZE_LIMIT';
                break;
              case 429:
                errorType = 'USAGE_LIMIT';
                limitInfo = {
                  upgrade_required: data.upgrade_required,
                  current_plan: data.current_plan,
                  usage: data.usage
                };
                break;
              case 401:
              case 403:
                errorType = 'AUTH_REQUIRED';
                break;
              case 400:
                if (data.error && data.error.toLowerCase().includes('file') && data.error.toLowerCase().includes('size')) {
                  errorType = 'FILE_SIZE_LIMIT';
                }
                break;
            }
            
            resolve({
              success: false,
              error: data.error || `HTTP ${xhr.status}: ${xhr.statusText}`,
              errorType,
              limitInfo
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: 'Invalid response from server'
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error occurred'
        });
      });

      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: 'Upload timeout'
        });
      });

      xhr.addEventListener('abort', () => {
        resolve({
          success: false,
          error: 'Upload cancelled'
        });
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      xhr.open('POST', `${API_BASE_URL}/upload`);
      xhr.timeout = 5 * 60 * 1000; // 5 minutes timeout
      xhr.send(formData);
    });
  }

  static async getTransformationStatus(resultId: string): Promise<ApiResponse<{ resultId: string; ready: boolean; originalName: string }>> {
    const response = await fetch(`${API_BASE_URL}/transform/${resultId}`);
    return await response.json();
  }

  static getDownloadUrl(resultId: string): string {
    return `${API_BASE_URL}/download/${resultId}`;
  }

  static async downloadFile(resultId: string): Promise<void> {
    const url = this.getDownloadUrl(resultId);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transformed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}