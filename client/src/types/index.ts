export interface TransformationRule {
  id: string;
  type: 'remove_pages' | 'rotate_pages' | 'add_watermark' | 'merge_pdfs' | 'compress' | 'redact_text' | 'add_page_numbers' | 'rearrange_pages' | 'extract_pages';
  pages?: number[];
  angle?: number;
  text?: string;
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  opacity?: number;
  mergeFiles?: string[];
  pageOrder?: number[];
  pageRange?: { start: number; end: number };
  redactWords?: string[];
  fontSize?: number;
  fontColor?: string;
}

export interface UploadedFile {
  fileId: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

export interface TransformationResult {
  success: boolean;
  resultFileId?: string;
  message?: string;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
} 