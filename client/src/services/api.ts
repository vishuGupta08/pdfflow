import { UploadedFile, TransformationRule, ApiResponse } from '../types/index';

export interface TransformResult {
  success: boolean;
  downloadId?: string;
  previewId?: string;
  fileName?: string;
  error?: string;
}

// Use environment variable for API base URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const transformPDF = async (
  fileId: string,
  transformations: TransformationRule[]
): Promise<TransformResult> => {
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

  return await response.json();
};

export class ApiService {
  static async uploadFile(file: File): Promise<ApiResponse<UploadedFile>> {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    return await response.json();
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