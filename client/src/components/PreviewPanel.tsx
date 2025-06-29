import { Eye, FileText, RotateCw, Shield, Scissors, Hash, ArrowUpDown, Archive, CheckCircle } from 'lucide-react';
import type { TransformationRule, UploadedFile } from '../types';

interface PreviewPanelProps {
  rules: TransformationRule[];
  fileName?: string;
  uploadedFile?: UploadedFile | null;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ rules, fileName, uploadedFile }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompressionEstimate = (originalSize: number, level: string): { size: number; reduction: number } => {
    const reductionRates = {
      low: 0.10,      // 10% reduction (minimal compression, best quality)
      medium: 0.45,   // 45% reduction (balanced)
      high: 0.70,     // 70% reduction (significant compression)
      maximum: 0.85,  // 85% reduction (maximum compression)
      custom: 0.50    // Default 50% for custom
    };
    
    const reduction = reductionRates[level as keyof typeof reductionRates] || 0.40;
    const estimatedSize = originalSize * (1 - reduction);
    
    return {
      size: estimatedSize,
      reduction: reduction * 100
    };
  };

  const getIcon = (type: TransformationRule['type']) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (type) {
      case 'remove_pages':
        return <Scissors {...iconProps} />;
      case 'rotate_pages':
        return <RotateCw {...iconProps} />;
      case 'add_watermark':
        return <Shield {...iconProps} />;
      case 'redact_text':
        return <Eye {...iconProps} />;
      case 'add_page_numbers':
        return <Hash {...iconProps} />;
      case 'extract_pages':
        return <FileText {...iconProps} />;
      case 'rearrange_pages':
        return <ArrowUpDown {...iconProps} />;
      case 'compress':
        return <Archive {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const getDescription = (rule: TransformationRule): string => {
    switch (rule.type) {
      case 'remove_pages':
        return `Remove pages: ${rule.pages?.join(', ') || 'None specified'}`;
      case 'rotate_pages':
        return `Rotate pages ${rule.pages?.join(', ') || 'None'} by ${rule.angle || 90}°`;
      case 'add_watermark':
        return `Add watermark "${rule.text || 'WATERMARK'}" at ${rule.position || 'center'} (${Math.round((rule.opacity || 0.3) * 100)}% opacity)`;
      case 'redact_text':
        return `Redact: ${rule.redactWords?.join(', ') || 'No words specified'}`;
      case 'add_page_numbers':
        return `Add page numbers at ${rule.position || 'bottom-center'} (${rule.fontSize || 12}pt)`;
      case 'extract_pages':
        return `Extract pages ${rule.pageRange?.start || 1} to ${rule.pageRange?.end || 1}`;
      case 'rearrange_pages':
        return `Rearrange to order: ${rule.pageOrder?.join(', ') || 'No order specified'}`;
      case 'compress': {
        const level = rule.compressionLevel || 'medium';
        const quality = rule.imageQuality || 85;
        let description = `${level.charAt(0).toUpperCase() + level.slice(1)} compression (${quality}% image quality)`;
        
        if (uploadedFile) {
          const originalSize = uploadedFile.size;
          if (level === 'custom' && rule.targetFileSize) {
            const targetBytes = rule.targetFileSize * 1024;
            const reduction = ((originalSize - targetBytes) / originalSize) * 100;
            description += `\nOriginal: ${formatFileSize(originalSize)} → Target: ${formatFileSize(targetBytes)} (${reduction.toFixed(1)}% reduction)`;
          } else {
            const estimate = getCompressionEstimate(originalSize, level);
            description += `\nOriginal: ${formatFileSize(originalSize)} → Estimated: ${formatFileSize(estimate.size)} (~${estimate.reduction.toFixed(0)}% reduction)`;
          }
        } else if (level === 'custom' && rule.targetFileSize) {
          description += ` - Target: ${rule.targetFileSize} KB`;
        }
        
        return description;
      }
      default:
        return 'Unknown transformation';
    }
  };

  const getTypeLabel = (type: TransformationRule['type']): string => {
    switch (type) {
      case 'remove_pages':
        return 'Remove Pages';
      case 'rotate_pages':
        return 'Rotate Pages';
      case 'add_watermark':
        return 'Add Watermark';
      case 'redact_text':
        return 'Redact Text';
      case 'add_page_numbers':
        return 'Add Page Numbers';
      case 'extract_pages':
        return 'Extract Pages';
      case 'rearrange_pages':
        return 'Rearrange Pages';
      case 'compress':
        return 'Compress PDF';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Preview</h2>
          <p className="section-subtitle">Review your transformation plan</p>
        </div>
      </div>
      
      {fileName && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-25 rounded-xl border border-primary-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary-900 text-sm">{fileName}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="h-3 w-3 text-success-500" />
                <span className="text-xs text-primary-700">
                  {rules.length} transformation{rules.length !== 1 ? 's' : ''} configured
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Eye className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">No transformations yet</h3>
          <p className="text-sm text-gray-500">
            Add transformation rules to see them previewed here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">
              Execution Order
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {rules.length} step{rules.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {rules.map((rule, index) => (
            <div key={rule.id} className="relative">
              {/* Connection Line */}
              {index < rules.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-200"></div>
              )}
              
              <div className="flex items-start space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="step-indicator text-xs">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="text-primary-600">
                      {getIcon(rule.type)}
                    </div>
                    <span className="font-medium text-gray-900 text-sm">
                      {getTypeLabel(rule.type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {getDescription(rule)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-success-50 to-success-25 rounded-xl border border-success-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-success-600" />
              <span className="text-sm font-medium text-success-800">
                Ready to transform
              </span>
            </div>
            <p className="text-xs text-success-700 mt-1">
              All transformations will be applied in the order shown above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 