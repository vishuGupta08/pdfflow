import { Plus, Trash2, Settings, RotateCw, Shield, Eye, Hash, Scissors, ArrowUpDown, Archive, Image, FileText, FilePlus, Crop, Palette, MessageSquare, Square, Maximize2, Lock, Copy, GitMerge } from 'lucide-react';
import type { TransformationRule, UploadedFile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useRef, useState } from 'react';
import { ApiService } from '../services/api';

interface TransformationRuleFormProps {
  rules: TransformationRule[];
  onRulesChange: (rules: TransformationRule[]) => void;
  uploadedFile?: UploadedFile | null;
}

const transformationTypes = [
  // Page Operations
  { value: 'remove_pages', label: 'Remove Pages', icon: Scissors, description: 'Delete specific pages from your PDF', category: 'Page Operations' },
  { value: 'rotate_pages', label: 'Rotate Pages', icon: RotateCw, description: 'Rotate pages by 90°, 180°, or 270°', category: 'Page Operations' },
  { value: 'extract_pages', label: 'Extract Pages', icon: Scissors, description: 'Extract a range of pages', category: 'Page Operations' },
  { value: 'rearrange_pages', label: 'Rearrange Pages', icon: ArrowUpDown, description: 'Change the order of pages', category: 'Page Operations' },
  { value: 'add_blank_pages', label: 'Add Blank Pages', icon: FilePlus, description: 'Insert empty pages at specific positions', category: 'Page Operations' },
  { value: 'crop_pages', label: 'Crop Pages', icon: Crop, description: 'Trim pages to specific dimensions', category: 'Page Operations' },
  { value: 'resize_pages', label: 'Resize Pages', icon: Maximize2, description: 'Change page dimensions and scaling', category: 'Page Operations' },
  
  // Document Management
  { value: 'merge_pdfs', label: 'Merge PDFs', icon: GitMerge, description: 'Combine multiple PDF files into one', category: 'Document Management' },
  { value: 'split_pdf', label: 'Split PDF', icon: Copy, description: 'Split PDF into multiple documents', category: 'Document Management' },
  { value: 'compress', label: 'Compress PDF', icon: Archive, description: 'Reduce file size with various quality options', category: 'Document Management' },
  
  // Content & Annotations
  { value: 'add_watermark', label: 'Add Watermark', icon: Shield, description: 'Add text watermark to all pages', category: 'Content & Annotations' },
  { value: 'add_image', label: 'Add Image/Logo', icon: Image, description: 'Insert images or logos into PDF pages', category: 'Content & Annotations' },
  { value: 'add_header_footer', label: 'Headers & Footers', icon: FileText, description: 'Add consistent headers and footers', category: 'Content & Annotations' },
  { value: 'add_page_numbers', label: 'Add Page Numbers', icon: Hash, description: 'Number your pages automatically', category: 'Content & Annotations' },
  { value: 'add_text_annotation', label: 'Text Annotations', icon: MessageSquare, description: 'Add text boxes, comments, and highlights', category: 'Content & Annotations' },
  { value: 'add_background', label: 'Background', icon: Palette, description: 'Add background colors or images', category: 'Content & Annotations' },
  { value: 'add_border', label: 'Add Borders', icon: Square, description: 'Add decorative borders around pages', category: 'Content & Annotations' },
  
  // Security & Privacy
  { value: 'redact_text', label: 'Redact Text', icon: Eye, description: 'Hide sensitive information', category: 'Security & Privacy' },
  { value: 'password_protect', label: 'Password Protection', icon: Lock, description: 'Add password encryption and permissions', category: 'Security & Privacy' },
] as const;

export const TransformationRuleForm: React.FC<TransformationRuleFormProps> = ({
  rules,
  onRulesChange,
  uploadedFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [showTransformationModal, setShowTransformationModal] = useState(false);

  const addRule = () => {
    const newRule: TransformationRule = {
      id: uuidv4(),
      type: 'remove_pages'
    };
    onRulesChange([...rules, newRule]);
  };

  const addRuleWithType = (type: TransformationRule['type']) => {
    const newRule: TransformationRule = {
      id: uuidv4(),
      type
    };
    onRulesChange([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<TransformationRule>) => {
    onRulesChange(rules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const removeRule = (id: string) => {
    onRulesChange(rules.filter(rule => rule.id !== id));
  };

  const getTypeConfig = (type: TransformationRule['type']) => {
    return transformationTypes.find(t => t.value === type) || transformationTypes[0];
  };

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

  const handleMergeFileUpload = async (ruleId: string, files: FileList) => {
    if (!files || files.length === 0) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      if (file.type !== 'application/pdf') {
        alert(`${file.name} is not a PDF file. Only PDF files are supported.`);
        return null;
      }

      try {
        const response = await ApiService.uploadFile(file);
        if (response.success && response.data) {
          return response.data.fileId;
        } else {
          console.error('Upload failed:', response.error);
          alert(`Failed to upload ${file.name}: ${response.error}`);
          return null;
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const uploadedFileIds = await Promise.all(uploadPromises);
    const validFileIds = uploadedFileIds.filter(id => id !== null) as string[];

    if (validFileIds.length > 0) {
      const rule = rules.find(r => r.id === ruleId);
      const currentMergeFiles = rule?.mergeFiles || [];
      updateRule(ruleId, { 
        mergeFiles: [...currentMergeFiles, ...validFileIds] 
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTransformationTypeChange = (ruleId: string, newType: TransformationRule['type']) => {
    updateRule(ruleId, { type: newType });
    setShowTransformationModal(false);
    setSelectedRuleId(null);
  };

  const openTransformationModal = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    setShowTransformationModal(true);
  };

  const closeTransformationModal = () => {
    setShowTransformationModal(false);
    setSelectedRuleId(null);
  };

  // Transformation Type Selection Modal
  const TransformationTypeModal = () => {
    if (!showTransformationModal || !selectedRuleId) return null;

    const currentRule = rules.find(r => r.id === selectedRuleId);
    if (!currentRule) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Choose Transformation Type</h3>
              <button
                onClick={closeTransformationModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5 rotate-45 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-8">
              {['Page Operations', 'Document Management', 'Content & Annotations', 'Security & Privacy'].map((category) => {
                const categoryTypes = transformationTypes.filter(type => type.category === category);
                
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-px bg-gradient-to-r from-primary-200 to-transparent flex-1" />
                      <h4 className="font-semibold text-gray-900 px-3">{category}</h4>
                      <div className="h-px bg-gradient-to-l from-primary-200 to-transparent flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryTypes.map((type) => {
                        const IconComponent = type.icon;
                        
                        return (
                          <button
                            key={type.value}
                            onClick={() => addRuleWithType(type.value)}
                            className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-gray-100 group-hover:bg-primary-100 rounded-lg transition-colors duration-200">
                                <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-primary-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 group-hover:text-primary-900 text-sm mb-1">
                                  {type.label}
                                </h4>
                                <p className="text-xs text-gray-500 group-hover:text-primary-700 leading-relaxed">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRuleFields = (rule: TransformationRule) => {
    switch (rule.type) {
      case 'remove_pages':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to remove
              </label>
              <input
                type="text"
                placeholder="e.g., 1,3,5 or 1-3,7"
                className="input-field"
                value={rule.pages?.join(',') || ''}
                onChange={(e) => {
                  const pages = e.target.value
                    .split(',')
                    .map(p => parseInt(p.trim()))
                    .filter(p => !isNaN(p));
                  updateRule(rule.id, { pages });
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter page numbers separated by commas (e.g., 1,3,5)
              </p>
            </div>
          </div>
        );

      case 'rotate_pages':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to rotate
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5"
                className="input-field"
                value={rule.pages?.join(',') || ''}
                onChange={(e) => {
                  const pages = e.target.value
                    .split(',')
                    .map(p => parseInt(p.trim()))
                    .filter(p => !isNaN(p));
                  updateRule(rule.id, { pages });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rotation angle
              </label>
              <select
                className="select-field"
                value={rule.angle || 90}
                onChange={(e) => updateRule(rule.id, { angle: parseInt(e.target.value) })}
              >
                <option value={90}>90° (clockwise)</option>
                <option value={180}>180°</option>
                <option value={270}>270° (counter-clockwise)</option>
                <option value={-90}>-90° (counter-clockwise)</option>
              </select>
            </div>
          </div>
        );

      case 'add_watermark':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watermark text
              </label>
              <input
                type="text"
                placeholder="CONFIDENTIAL"
                className="input-field"
                value={rule.text || ''}
                onChange={(e) => updateRule(rule.id, { text: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <select
                className="select-field"
                value={rule.position || 'center'}
                onChange={(e) => updateRule(rule.id, { position: e.target.value as TransformationRule['position'] })}
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="center-left">Center Left</option>
                <option value="center">Center</option>
                <option value="center-right">Center Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opacity: {Math.round((rule.opacity || 0.3) * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                value={rule.opacity || 0.3}
                onChange={(e) => updateRule(rule.id, { opacity: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'redact_text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Words/phrases to redact
            </label>
            <input
              type="text"
              placeholder="confidential, secret, private"
              className="input-field"
              value={rule.redactWords?.join(', ') || ''}
              onChange={(e) => {
                const words = e.target.value.split(',').map(w => w.trim()).filter(w => w);
                updateRule(rule.id, { redactWords: words });
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple words or phrases with commas
            </p>
          </div>
        );

      case 'add_page_numbers':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <select
                className="select-field"
                value={rule.position || 'bottom-center'}
                onChange={(e) => updateRule(rule.id, { position: e.target.value as TransformationRule['position'] })}
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font size
              </label>
              <input
                type="number"
                min="8"
                max="72"
                className="input-field"
                value={rule.fontSize || 12}
                onChange={(e) => updateRule(rule.id, { fontSize: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'extract_pages':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start page
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={rule.pageRange?.start || 1}
                onChange={(e) => updateRule(rule.id, { 
                  pageRange: { 
                    start: parseInt(e.target.value), 
                    end: rule.pageRange?.end || 1 
                  } 
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End page
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={rule.pageRange?.end || 1}
                onChange={(e) => updateRule(rule.id, { 
                  pageRange: { 
                    start: rule.pageRange?.start || 1, 
                    end: parseInt(e.target.value) 
                  } 
                })}
              />
            </div>
          </div>
        );

      case 'rearrange_pages':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New page order
            </label>
            <input
              type="text"
              placeholder="e.g., 3,1,2,4"
              className="input-field"
              value={rule.pageOrder?.join(',') || ''}
              onChange={(e) => {
                const order = e.target.value
                  .split(',')
                  .map(p => parseInt(p.trim()))
                  .filter(p => !isNaN(p));
                updateRule(rule.id, { pageOrder: order });
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the desired page order separated by commas (e.g., 3,1,2,4)
            </p>
          </div>
        );

      case 'compress': {
        const originalFileSize = uploadedFile?.size || 0;
        const compressionLevel = rule.compressionLevel || 'medium';
        const estimate = getCompressionEstimate(originalFileSize, compressionLevel);
        
        return (
          <div className="space-y-6">
            {/* Original File Size Info */}
            {uploadedFile && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Original File Size</p>
                    <p className="text-lg font-semibold text-gray-900">{formatFileSize(originalFileSize)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Estimated After Compression</p>
                    <p className="text-lg font-semibold text-primary-600">{formatFileSize(estimate.size)}</p>
                    <p className="text-xs text-success-600">~{estimate.reduction.toFixed(0)}% reduction</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compression Level
                </label>
                <select
                  className="select-field"
                  value={rule.compressionLevel || 'medium'}
                  onChange={(e) => updateRule(rule.id, { 
                    compressionLevel: e.target.value as TransformationRule['compressionLevel'] 
                  })}
                >
                  <option value="low">Low Compression (Best Quality)</option>
                  <option value="medium">Medium Compression (Balanced)</option>
                  <option value="high">High Compression (Smaller Size)</option>
                  <option value="maximum">Maximum Compression (Smallest Size)</option>
                  <option value="custom">Custom Target Size</option>
                </select>
                
                {/* Show size estimates for each level */}
                {uploadedFile && (
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {['low', 'medium', 'high', 'maximum'].map((level) => {
                      const levelEstimate = getCompressionEstimate(originalFileSize, level);
                      const isSelected = compressionLevel === level;
                      return (
                        <div key={level} className={`flex justify-between ${isSelected ? 'font-medium text-primary-600' : ''}`}>
                          <span>{level.charAt(0).toUpperCase() + level.slice(1)}:</span>
                          <span>{formatFileSize(levelEstimate.size)} (~{levelEstimate.reduction.toFixed(0)}% smaller)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Quality: {rule.imageQuality || 85}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={rule.imageQuality || 85}
                  onChange={(e) => updateRule(rule.id, { imageQuality: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Smaller size</span>
                  <span>Better quality</span>
                </div>
                
                {/* Image quality impact indicator */}
                {uploadedFile && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <p className="text-amber-800">
                      <strong>Quality Impact:</strong> Lower values significantly reduce file size but may affect image clarity.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {rule.compressionLevel === 'custom' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Target File Size (KB)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="50000"
                      placeholder="e.g., 500"
                      className="input-field border-blue-300 focus:border-blue-500"
                      value={rule.targetFileSize || ''}
                      onChange={(e) => updateRule(rule.id, { 
                        targetFileSize: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      Enter desired file size in kilobytes
                    </p>
                    
                    {/* Show target size vs original comparison */}
                    {uploadedFile && rule.targetFileSize && (
                      <div className="mt-2 text-xs">
                        <div className="flex justify-between text-blue-700">
                          <span>Original:</span>
                          <span>{formatFileSize(originalFileSize)}</span>
                        </div>
                        <div className="flex justify-between text-blue-700">
                          <span>Target:</span>
                          <span>{formatFileSize(rule.targetFileSize * 1024)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-blue-800 mt-1 pt-1 border-t border-blue-200">
                          <span>Reduction:</span>
                          <span>{(((originalFileSize - (rule.targetFileSize * 1024)) / originalFileSize) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg w-full">
                      <div className="flex items-center space-x-2 text-blue-800">
                        <Archive className="h-5 w-5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Custom Compression</p>
                          <p className="text-xs">Target: {rule.targetFileSize || 'Not set'} KB</p>
                          {rule.targetFileSize && uploadedFile && (
                            <p className="text-xs text-blue-600 mt-1">
                              {rule.targetFileSize * 1024 < originalFileSize ? '✓ Size reduction' : '⚠️ Size increase'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Archive className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">Compression Info</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {rule.compressionLevel === 'low' && <p>• Reduces file size by 5-15% with minimal quality loss (300 DPI)</p>}
                    {rule.compressionLevel === 'medium' && <p>• Reduces file size by 35-55% with good quality balance (150 DPI)</p>}
                    {rule.compressionLevel === 'high' && <p>• Reduces file size by 60-80% with noticeable quality reduction (100 DPI)</p>}
                    {rule.compressionLevel === 'maximum' && <p>• Reduces file size by 75-95% with significant quality reduction (72 DPI)</p>}
                    {rule.compressionLevel === 'custom' && <p>• Attempts to reach your target file size with optimal quality</p>}
                    <p>• Images are downsampled and optimized using Ghostscript</p>
                    <p>• Text and vector graphics remain sharp at all compression levels</p>
                    <p>• Uses professional PDF optimization techniques</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'merge_pdfs':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF Files to Merge
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FilePlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-2">Upload additional PDFs to merge</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleMergeFileUpload(rule.id, e.target.files)}
                />
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add PDF Files
                </button>
              </div>
              {rule.mergeFiles && rule.mergeFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rule.mergeFiles.map((fileId, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">PDF File {index + 1} (ID: {fileId})</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = rule.mergeFiles?.filter((_, i) => i !== index) || [];
                          updateRule(rule.id, { mergeFiles: newFiles });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'split_pdf':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Split Method
              </label>
              <select
                className="select-field"
                value={rule.splitBy || 'page_count'}
                onChange={(e) => updateRule(rule.id, { splitBy: e.target.value as 'page_count' | 'page_ranges' | 'individual_pages' })}
              >
                <option value="page_count">Split by Page Count</option>
                <option value="page_ranges">Split by Custom Ranges</option>
                <option value="individual_pages">Split into Individual Pages</option>
              </select>
            </div>

            {rule.splitBy === 'page_count' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pages per Split
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={rule.pagesPerSplit || 1}
                  onChange={(e) => updateRule(rule.id, { pagesPerSplit: parseInt(e.target.value) })}
                />
              </div>
            )}

            {rule.splitBy === 'page_ranges' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Ranges
                </label>
                <div className="space-y-2">
                  {(rule.splitRanges || [{ start: 1, end: 1 }]).map((range, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Start"
                        className="input-field"
                        value={range.start}
                        onChange={(e) => {
                          const newRanges = [...(rule.splitRanges || [])];
                          newRanges[index] = { ...range, start: parseInt(e.target.value) };
                          updateRule(rule.id, { splitRanges: newRanges });
                        }}
                      />
                      <input
                        type="number"
                        placeholder="End"
                        className="input-field"
                        value={range.end}
                        onChange={(e) => {
                          const newRanges = [...(rule.splitRanges || [])];
                          newRanges[index] = { ...range, end: parseInt(e.target.value) };
                          updateRule(rule.id, { splitRanges: newRanges });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        className="input-field"
                        value={range.name || ''}
                        onChange={(e) => {
                          const newRanges = [...(rule.splitRanges || [])];
                          newRanges[index] = { ...range, name: e.target.value };
                          updateRule(rule.id, { splitRanges: newRanges });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newRanges = (rule.splitRanges || []).filter((_, i) => i !== index);
                          updateRule(rule.id, { splitRanges: newRanges });
                        }}
                        className="btn-ghost p-2 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newRanges = [...(rule.splitRanges || []), { start: 1, end: 1 }];
                      updateRule(rule.id, { splitRanges: newRanges });
                    }}
                    className="btn-secondary w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Range
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'add_image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-2">Upload an image (PNG, JPG, SVG)</p>
                <button type="button" className="btn-secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Select Image
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  className="select-field"
                  value={rule.position || 'center'}
                  onChange={(e) => updateRule(rule.id, { position: e.target.value as TransformationRule['position'] })}
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="center-left">Center Left</option>
                  <option value="center">Center</option>
                  <option value="center-right">Center Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width (px)
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={rule.imageWidth || ''}
                  onChange={(e) => updateRule(rule.id, { imageWidth: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (px)
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={rule.imageHeight || ''}
                  onChange={(e) => updateRule(rule.id, { imageHeight: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`maintain-aspect-${rule.id}`}
                checked={rule.maintainAspectRatio !== false}
                onChange={(e) => updateRule(rule.id, { maintainAspectRatio: e.target.checked })}
                className="checkbox"
              />
              <label htmlFor={`maintain-aspect-${rule.id}`} className="text-sm text-gray-700">
                Maintain aspect ratio
              </label>
            </div>
          </div>
        );

      case 'add_header_footer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Header Text
                </label>
                <input
                  type="text"
                  placeholder="Document Title"
                  className="input-field"
                  value={rule.headerText || ''}
                  onChange={(e) => updateRule(rule.id, { headerText: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Footer Text
                </label>
                <input
                  type="text"
                  placeholder="Company Name"
                  className="input-field"
                  value={rule.footerText || ''}
                  onChange={(e) => updateRule(rule.id, { footerText: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`include-page-number-${rule.id}`}
                  checked={rule.includePageNumber || false}
                  onChange={(e) => updateRule(rule.id, { includePageNumber: e.target.checked })}
                  className="checkbox"
                />
                <label htmlFor={`include-page-number-${rule.id}`} className="text-sm text-gray-700">
                  Page Numbers
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`include-date-${rule.id}`}
                  checked={rule.includeDate || false}
                  onChange={(e) => updateRule(rule.id, { includeDate: e.target.checked })}
                  className="checkbox"
                />
                <label htmlFor={`include-date-${rule.id}`} className="text-sm text-gray-700">
                  Date
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`different-first-${rule.id}`}
                  checked={rule.differentFirstPage || false}
                  onChange={(e) => updateRule(rule.id, { differentFirstPage: e.target.checked })}
                  className="checkbox"
                />
                <label htmlFor={`different-first-${rule.id}`} className="text-sm text-gray-700">
                  Different First Page
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size
                </label>
                <input
                  type="number"
                  min="8"
                  max="72"
                  className="input-field"
                  value={rule.fontSize || 12}
                  onChange={(e) => updateRule(rule.id, { fontSize: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
        );

      case 'add_blank_pages':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert Position
                </label>
                <select
                  className="select-field"
                  value={rule.insertPosition || 'end'}
                  onChange={(e) => updateRule(rule.id, { insertPosition: e.target.value as 'beginning' | 'end' | 'after_page' | 'before_page' })}
                >
                  <option value="beginning">At Beginning</option>
                  <option value="end">At End</option>
                  <option value="after_page">After Page</option>
                  <option value="before_page">Before Page</option>
                </select>
              </div>

              {(rule.insertPosition === 'after_page' || rule.insertPosition === 'before_page') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Page Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={rule.targetPageNumber || 1}
                    onChange={(e) => updateRule(rule.id, { targetPageNumber: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Pages
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="input-field"
                  value={rule.blankPageCount || 1}
                  onChange={(e) => updateRule(rule.id, { blankPageCount: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Size
              </label>
              <select
                className="select-field"
                value={rule.blankPageSize || 'same_as_original'}
                onChange={(e) => updateRule(rule.id, { blankPageSize: e.target.value as 'same_as_original' | 'a4' | 'letter' | 'legal' | 'custom' })}
              >
                <option value="same_as_original">Same as Original</option>
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
                <option value="custom">Custom Size</option>
              </select>
            </div>

            {rule.blankPageSize === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (pt)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={rule.customWidth || ''}
                    onChange={(e) => updateRule(rule.id, { customWidth: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (pt)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={rule.customHeight || ''}
                    onChange={(e) => updateRule(rule.id, { customHeight: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'crop_pages':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Crop
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 (leave empty for all pages)"
                className="input-field"
                value={rule.pages?.join(',') || ''}
                onChange={(e) => {
                  const pages = e.target.value
                    .split(',')
                    .map(p => parseInt(p.trim()))
                    .filter(p => !isNaN(p));
                  updateRule(rule.id, { pages });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop Method
              </label>
              <select
                className="select-field"
                value={rule.cropPreset || 'custom'}
                onChange={(e) => updateRule(rule.id, { cropPreset: e.target.value as 'a4' | 'letter' | 'legal' | 'square' | 'custom' })}
              >
                <option value="custom">Custom Margins</option>
                <option value="a4">Crop to A4 Size</option>
                <option value="letter">Crop to Letter Size</option>
                <option value="legal">Crop to Legal Size</option>
                <option value="square">Crop to Square</option>
              </select>
            </div>

            {rule.cropPreset === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop Margins (pt)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input
                    type="number"
                    placeholder="Top"
                    className="input-field"
                    value={rule.cropMargins?.top || ''}
                    onChange={(e) => updateRule(rule.id, { 
                      cropMargins: { 
                        ...rule.cropMargins, 
                        top: e.target.value ? parseInt(e.target.value) : 0,
                        bottom: rule.cropMargins?.bottom || 0,
                        left: rule.cropMargins?.left || 0,
                        right: rule.cropMargins?.right || 0
                      } 
                    })}
                  />
                  <input
                    type="number"
                    placeholder="Bottom"
                    className="input-field"
                    value={rule.cropMargins?.bottom || ''}
                    onChange={(e) => updateRule(rule.id, { 
                      cropMargins: { 
                        ...rule.cropMargins, 
                        bottom: e.target.value ? parseInt(e.target.value) : 0,
                        top: rule.cropMargins?.top || 0,
                        left: rule.cropMargins?.left || 0,
                        right: rule.cropMargins?.right || 0
                      } 
                    })}
                  />
                  <input
                    type="number"
                    placeholder="Left"
                    className="input-field"
                    value={rule.cropMargins?.left || ''}
                    onChange={(e) => updateRule(rule.id, { 
                      cropMargins: { 
                        ...rule.cropMargins, 
                        left: e.target.value ? parseInt(e.target.value) : 0,
                        top: rule.cropMargins?.top || 0,
                        bottom: rule.cropMargins?.bottom || 0,
                        right: rule.cropMargins?.right || 0
                      } 
                    })}
                  />
                  <input
                    type="number"
                    placeholder="Right"
                    className="input-field"
                    value={rule.cropMargins?.right || ''}
                    onChange={(e) => updateRule(rule.id, { 
                      cropMargins: { 
                        ...rule.cropMargins, 
                        right: e.target.value ? parseInt(e.target.value) : 0,
                        top: rule.cropMargins?.top || 0,
                        bottom: rule.cropMargins?.bottom || 0,
                        left: rule.cropMargins?.left || 0
                      } 
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'add_background':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border border-gray-300"
                    value={rule.backgroundColor || '#ffffff'}
                    onChange={(e) => updateRule(rule.id, { backgroundColor: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="#ffffff"
                    className="input-field flex-1"
                    value={rule.backgroundColor || ''}
                    onChange={(e) => updateRule(rule.id, { backgroundColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opacity: {Math.round((rule.backgroundOpacity || 1) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={rule.backgroundOpacity || 1}
                  onChange={(e) => updateRule(rule.id, { backgroundOpacity: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Image className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Upload background image</p>
                <button type="button" className="btn-secondary mt-2">
                  Select Image
                </button>
              </div>
            </div>

            {rule.backgroundImage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Scaling
                </label>
                <select
                  className="select-field"
                  value={rule.backgroundScale || 'fit'}
                  onChange={(e) => updateRule(rule.id, { backgroundScale: e.target.value as 'fit' | 'fill' | 'stretch' | 'tile' })}
                >
                  <option value="fit">Fit (maintain aspect ratio)</option>
                  <option value="fill">Fill (crop if needed)</option>
                  <option value="stretch">Stretch (may distort)</option>
                  <option value="tile">Tile (repeat)</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'add_text_annotation':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Text Annotations
              </label>
              <button
                type="button"
                onClick={() => {
                  const newAnnotation = {
                    id: Date.now().toString(),
                    type: 'text' as const,
                    content: '',
                    x: 100,
                    y: 100,
                    fontSize: 12,
                    color: '#000000'
                  };
                  updateRule(rule.id, { 
                    annotations: [...(rule.annotations || []), newAnnotation] 
                  });
                }}
                className="btn-secondary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Annotation
              </button>
            </div>

            {rule.annotations && rule.annotations.length > 0 ? (
              <div className="space-y-3">
                {rule.annotations.map((annotation, index) => (
                  <div key={annotation.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          className="select-field text-sm"
                          value={annotation.type}
                          onChange={(e) => {
                            const newAnnotations = [...(rule.annotations || [])];
                            newAnnotations[index] = { ...annotation, type: e.target.value as 'text' | 'sticky_note' | 'highlight' };
                            updateRule(rule.id, { annotations: newAnnotations });
                          }}
                        >
                          <option value="text">Text Box</option>
                          <option value="sticky_note">Sticky Note</option>
                          <option value="highlight">Highlight</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Content
                        </label>
                        <input
                          type="text"
                          className="input-field text-sm"
                          value={annotation.content}
                          onChange={(e) => {
                            const newAnnotations = [...(rule.annotations || [])];
                            newAnnotations[index] = { ...annotation, content: e.target.value };
                            updateRule(rule.id, { annotations: newAnnotations });
                          }}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            X
                          </label>
                          <input
                            type="number"
                            className="input-field text-sm"
                            value={annotation.x}
                            onChange={(e) => {
                              const newAnnotations = [...(rule.annotations || [])];
                              newAnnotations[index] = { ...annotation, x: parseInt(e.target.value) };
                              updateRule(rule.id, { annotations: newAnnotations });
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Y
                          </label>
                          <input
                            type="number"
                            className="input-field text-sm"
                            value={annotation.y}
                            onChange={(e) => {
                              const newAnnotations = [...(rule.annotations || [])];
                              newAnnotations[index] = { ...annotation, y: parseInt(e.target.value) };
                              updateRule(rule.id, { annotations: newAnnotations });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newAnnotations = (rule.annotations || []).filter((_, i) => i !== index);
                            updateRule(rule.id, { annotations: newAnnotations });
                          }}
                          className="btn-ghost p-2 text-red-600 self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No annotations added yet</p>
              </div>
            )}
          </div>
        );

      case 'add_border':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Add Border
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 (leave empty for all pages)"
                className="input-field"
                value={rule.pages?.join(',') || ''}
                onChange={(e) => {
                  const pages = e.target.value
                    .split(',')
                    .map(p => parseInt(p.trim()))
                    .filter(p => !isNaN(p));
                  updateRule(rule.id, { pages });
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Color
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    className="w-10 h-10 rounded border border-gray-300"
                    value={rule.borderColor || '#000000'}
                    onChange={(e) => updateRule(rule.id, { borderColor: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="#000000"
                    className="input-field flex-1"
                    value={rule.borderColor || ''}
                    onChange={(e) => updateRule(rule.id, { borderColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width (pt)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="input-field"
                  value={rule.borderWidth || 2}
                  onChange={(e) => updateRule(rule.id, { borderWidth: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <select
                  className="select-field"
                  value={rule.borderStyle || 'solid'}
                  onChange={(e) => updateRule(rule.id, { borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Margin (pt)
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={rule.borderMargin || 10}
                  onChange={(e) => updateRule(rule.id, { borderMargin: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
        );

      case 'resize_pages':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Resize
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 (leave empty for all pages)"
                className="input-field"
                value={rule.pages?.join(',') || ''}
                onChange={(e) => {
                  const pages = e.target.value
                    .split(',')
                    .map(p => parseInt(p.trim()))
                    .filter(p => !isNaN(p));
                  updateRule(rule.id, { pages });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resize Method
              </label>
              <select
                className="select-field"
                value={rule.resizeMode || 'scale'}
                onChange={(e) => updateRule(rule.id, { resizeMode: e.target.value as 'scale' | 'fit_to_size' | 'custom_dimensions' })}
              >
                <option value="scale">Scale by Factor</option>
                <option value="fit_to_size">Fit to Standard Size</option>
                <option value="custom_dimensions">Custom Dimensions</option>
              </select>
            </div>

            {rule.resizeMode === 'scale' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scale Factor: {rule.scaleFactor || 1}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={rule.scaleFactor || 1}
                  onChange={(e) => updateRule(rule.id, { scaleFactor: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.1x (10%)</span>
                  <span>3x (300%)</span>
                </div>
              </div>
            )}

            {rule.resizeMode === 'fit_to_size' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Size
                </label>
                <select
                  className="select-field"
                  value={rule.targetSize || 'a4'}
                  onChange={(e) => updateRule(rule.id, { targetSize: e.target.value as 'a4' | 'letter' | 'legal' | 'custom' })}
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="letter">Letter (8.5 × 11 in)</option>
                  <option value="legal">Legal (8.5 × 14 in)</option>
                  <option value="custom">Custom Size</option>
                </select>
              </div>
            )}

            {rule.resizeMode === 'custom_dimensions' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (pt)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={rule.newWidth || ''}
                    onChange={(e) => updateRule(rule.id, { newWidth: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (pt)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={rule.newHeight || ''}
                    onChange={(e) => updateRule(rule.id, { newHeight: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`maintain-content-aspect-${rule.id}`}
                checked={rule.maintainContentAspectRatio !== false}
                onChange={(e) => updateRule(rule.id, { maintainContentAspectRatio: e.target.checked })}
                className="checkbox"
              />
              <label htmlFor={`maintain-content-aspect-${rule.id}`} className="text-sm text-gray-700">
                Maintain content aspect ratio
              </label>
            </div>
          </div>
        );

      case 'password_protect':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Password to open PDF"
                  className="input-field"
                  value={rule.userPassword || ''}
                  onChange={(e) => updateRule(rule.id, { userPassword: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required to open the PDF
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Password for permissions"
                  className="input-field"
                  value={rule.ownerPassword || ''}
                  onChange={(e) => updateRule(rule.id, { ownerPassword: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Controls what users can do with the PDF
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'printing', label: 'Allow Printing' },
                  { key: 'modifying', label: 'Allow Editing' },
                  { key: 'copying', label: 'Allow Copying' },
                  { key: 'annotating', label: 'Allow Comments' },
                  { key: 'filling', label: 'Allow Form Filling' },
                  { key: 'accessibility', label: 'Screen Readers' },
                  { key: 'assembling', label: 'Page Assembly' },
                  { key: 'qualityPrinting', label: 'High Quality Print' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`permission-${key}-${rule.id}`}
                      checked={rule.permissions?.[key as keyof typeof rule.permissions] || false}
                      onChange={(e) => updateRule(rule.id, { 
                        permissions: { 
                          ...rule.permissions, 
                          [key]: e.target.checked 
                        } 
                      })}
                      className="checkbox"
                    />
                    <label htmlFor={`permission-${key}-${rule.id}`} className="text-xs text-gray-700">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Security Note</p>
                  <p>Password protection adds an extra layer of security but may not be compatible with all PDF viewers. Test thoroughly before distribution.</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-primary-600" />
          <div>
            <h2 className="section-title">Transformation Rules</h2>
            <p className="section-subtitle">Configure how you want to transform your PDF</p>
          </div>
        </div>
        <button
          onClick={addRule}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </button>
      </div>

      {/* Enhanced Category-based Transformation Selector */}
      {rules.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start with a transformation</h3>
            <p className="text-gray-600 mb-6">Choose from our comprehensive set of PDF transformation tools</p>
          </div>

          {/* Category Grid */}
          <div className="space-y-8">
            {['Page Operations', 'Document Management', 'Content & Annotations', 'Security & Privacy'].map((category) => {
              const categoryTypes = transformationTypes.filter(type => type.category === category);
              
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gradient-to-r from-primary-200 to-transparent flex-1" />
                    <h3 className="font-semibold text-gray-900 px-3">{category}</h3>
                    <div className="h-px bg-gradient-to-l from-primary-200 to-transparent flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryTypes.map((type) => {
                      const IconComponent = type.icon;
                      
                      return (
                        <button
                          key={type.value}
                          onClick={() => addRuleWithType(type.value)}
                          className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-gray-100 group-hover:bg-primary-100 rounded-lg transition-colors duration-200">
                              <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 group-hover:text-primary-900 text-sm mb-1">
                                {type.label}
                              </h4>
                              <p className="text-xs text-gray-500 group-hover:text-primary-700 leading-relaxed">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => {
            const typeConfig = getTypeConfig(rule.type);
            const IconComponent = typeConfig.icon;
            
            return (
              <div key={rule.id} className="rule-card animate-slide-up">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="step-indicator text-xs">
                      {index + 1}
                    </div>
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => openTransformationModal(rule.id)}
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4 text-primary-600" />
                            <span className="font-medium text-gray-900">{typeConfig.label}</span>
                          </div>
                          <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                      <p className="text-sm text-gray-500 mt-1">{typeConfig.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="btn-ghost p-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="mt-4">
                  {renderRuleFields(rule)}
                </div>
              </div>
            );
          })}
          
          {/* Add Another Rule Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={addRule}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 group"
            >
              <div className="flex items-center justify-center space-x-2 text-gray-500 group-hover:text-primary-600">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Another Transformation</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Transformation Type Selection Modal */}
      <TransformationTypeModal />
    </div>
  );
}; 