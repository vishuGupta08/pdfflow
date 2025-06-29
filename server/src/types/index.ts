export interface TransformationRule {
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
  // Compression options
  compressionLevel?: 'low' | 'medium' | 'high' | 'maximum' | 'custom';
  targetFileSize?: number; // Target file size in KB for custom compression
  imageQuality?: number; // Image quality percentage (10-100)
}

export interface TransformRequest {
  fileId: string;
  transformations: TransformationRule[];
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

export interface TransformationResult {
  success: boolean;
  resultFileId?: string;
  message?: string;
  error?: string;
} 