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