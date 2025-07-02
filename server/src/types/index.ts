export interface TransformationRule {
  type: 'remove_pages' | 'rotate_pages' | 'add_watermark' | 'merge_pdfs' | 'compress' | 'redact_text' | 'add_page_numbers' | 'rearrange_pages' | 'extract_pages' | 'split_pdf' | 'add_image' | 'add_header_footer' | 'add_blank_pages' | 'crop_pages' | 'add_background' | 'add_text_annotation' | 'add_border' | 'resize_pages' | 'password_protect';
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
  
  // Split PDF options
  splitBy?: 'page_count' | 'page_ranges' | 'individual_pages';
  pagesPerSplit?: number;
  splitRanges?: { start: number; end: number; name?: string }[];
  
  // Image options
  imageFile?: string; // File ID or base64
  imageWidth?: number;
  imageHeight?: number;
  maintainAspectRatio?: boolean;
  
  // Header/Footer options
  headerText?: string;
  footerText?: string;
  includePageNumber?: boolean;
  includeDate?: boolean;
  differentFirstPage?: boolean;
  headerImage?: string;
  footerImage?: string;
  
  // Blank pages options
  insertPosition?: 'beginning' | 'end' | 'after_page' | 'before_page';
  targetPageNumber?: number;
  blankPageCount?: number;
  blankPageSize?: 'same_as_original' | 'a4' | 'letter' | 'legal' | 'custom';
  customWidth?: number;
  customHeight?: number;
  
  // Crop options
  cropBox?: { x: number; y: number; width: number; height: number };
  cropPreset?: 'a4' | 'letter' | 'legal' | 'square' | 'custom';
  cropMargins?: { top: number; bottom: number; left: number; right: number };
  
  // Background options
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundScale?: 'fit' | 'fill' | 'stretch' | 'tile';
  
  // Text annotation options
  annotations?: Array<{
    id: string;
    type: 'text' | 'sticky_note' | 'highlight' | 'underline' | 'strikethrough';
    content: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
    fontSize?: number;
  }>;
  
  // Border options
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  borderMargin?: number;
  
  // Resize options
  resizeMode?: 'scale' | 'fit_to_size' | 'custom_dimensions';
  scaleFactor?: number;
  targetSize?: 'a4' | 'letter' | 'legal' | 'custom';
  newWidth?: number;
  newHeight?: number;
  maintainContentAspectRatio?: boolean;
  
  // Password protection options
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    filling?: boolean;
    accessibility?: boolean;
    assembling?: boolean;
    qualityPrinting?: boolean;
  };
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