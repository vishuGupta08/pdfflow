import { Plus, Trash2, Settings, RotateCw, Shield, Eye, Hash, Scissors, ArrowUpDown, Archive, Image, FileText, FilePlus, Crop, Palette, MessageSquare, Square, Maximize2, Lock, Copy, GitMerge, KeyRound, FileDown } from 'lucide-react';
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
  { value: 'convert_to_word', label: 'Convert to Word', icon: FileDown, description: 'Convert PDF to Word document with high accuracy', category: 'Document Management' },
  
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
  { value: 'remove_password', label: 'Remove Password', icon: KeyRound, description: 'Remove existing password protection from PDF', category: 'Security & Privacy' },
] as const;

export const TransformationRuleForm: React.FC<TransformationRuleFormProps> = ({
  rules,
  onRulesChange,
  uploadedFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [showTransformationModal, setShowTransformationModal] = useState(false);
  
  // Local state to manage raw input values for page fields
  const [pageInputValues, setPageInputValues] = useState<Record<string, string>>({});

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
      type,
      // Set defaults for PDF to Word conversion
      ...(type === 'convert_to_word' && {
        wordFormat: 'docx',
        conversionQuality: 'medium',
        preserveLayout: true,
        extractImages: true,
        convertTables: true,
        ocrLanguage: 'eng'
      })
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

  const handleImageUpload = async (ruleId: string, files: FileList) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Only handle single image file
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

    if (!validImageTypes.includes(file.type)) {
      alert(`${file.name} is not a supported image file. Please use PNG, JPG, JPEG, SVG, or WebP files.`);
      return;
    }

    try {
      const response = await ApiService.uploadImage(file);
      if (response.success && response.data) {
        updateRule(ruleId, { 
          imageFile: response.data.fileId,
          imageFileName: file.name
        });
      } else {
        console.error('Image upload failed:', response.error);
        alert(`Failed to upload ${file.name}: ${response.error}`);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(`Failed to upload ${file.name}`);
    }

    // Reset image input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const triggerImageUpload = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    if (imageInputRef.current) {
      imageInputRef.current.click();
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
      case 'remove_pages': {
        const inputKey = `${rule.id}_pages`;
        const currentInputValue = pageInputValues[inputKey] || rule.pages?.join(',') || '';
        
        return (
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Pages to remove
              </label>
              <input
                type="text"
                placeholder="e.g., 1,3,5 or 1-3,7"
                className="input-field"
                value={currentInputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  // Update local state immediately for responsive UI
                  setPageInputValues(prev => ({ ...prev, [inputKey]: newValue }));
                  
                  console.log('🔍 Input change:', newValue);
                  
                  // Parse the input to extract page numbers and ranges
                  const pages: number[] = [];
                  const parts = newValue.split(',');
                  console.log('📝 Split parts:', parts);
                  
                  for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.includes('-')) {
                      // Handle range (e.g., "1-5")
                      const rangeParts = trimmed.split('-');
                      console.log('📊 Range parts:', rangeParts);
                      if (rangeParts.length === 2) {
                        const start = parseInt(rangeParts[0].trim());
                        const end = parseInt(rangeParts[1].trim());
                        if (!isNaN(start) && !isNaN(end) && start <= end) {
                          for (let i = start; i <= end; i++) {
                            if (!pages.includes(i)) {
                              pages.push(i);
                            }
                          }
                        }
                      }
                    } else {
                      // Handle single page
                      const pageNum = parseInt(trimmed);
                      if (!isNaN(pageNum) && !pages.includes(pageNum)) {
                        pages.push(pageNum);
                      }
                    }
                  }
                  
                  // Sort pages in ascending order
                  pages.sort((a, b) => a - b);
                  console.log('✅ Final pages:', pages);
                  updateRule(rule.id, { pages });
                }}
              />
              <p className="form-helper-text">
                Enter page numbers separated by commas (e.g., 1,3,5) or ranges (e.g., 1-3,7-9)
              </p>
            </div>
          </div>
        );
      }

      case 'rotate_pages': {
        const inputKey = `${rule.id}_pages`;
        const currentInputValue = pageInputValues[inputKey] || rule.pages?.join(',') || '';
        
        return (
          <div className="form-grid-2">
            <div>
              <label className="form-label">
                Pages to rotate
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 or 1-3,7"
                className="input-field"
                value={currentInputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  // Update local state immediately for responsive UI
                  setPageInputValues(prev => ({ ...prev, [inputKey]: newValue }));
                  
                  console.log('🔍 Rotate input change:', newValue);
                  
                  // Parse the input to extract page numbers and ranges
                  const pages: number[] = [];
                  const parts = newValue.split(',');
                  
                  for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.includes('-')) {
                      // Handle range (e.g., "1-5")
                      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                      if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                    } else {
                      // Handle single page
                      const pageNum = parseInt(trimmed);
                      if (!isNaN(pageNum) && !pages.includes(pageNum)) {
                        pages.push(pageNum);
                      }
                    }
                  }
                  
                  // Sort pages in ascending order
                  pages.sort((a, b) => a - b);
                  updateRule(rule.id, { pages });
                }}
              />
            </div>
            <div>
              <label className="form-label">
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
      }

      case 'add_watermark':
        return (
          <div className="form-grid-3">
            <div>
              <label className="form-label">
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
              <label className="form-label">
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
              <label className="form-label">
                Opacity: {Math.round((rule.opacity || 0.3) * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                className="input-field"
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

      case 'rearrange_pages': {
        const inputKey = `${rule.id}_pageOrder`;
        const currentInputValue = pageInputValues[inputKey] || rule.pageOrder?.join(',') || '';
        
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New page order
            </label>
            <input
              type="text"
              placeholder="e.g., 3,1,2,4"
              className="input-field"
              value={currentInputValue}
              onChange={(e) => {
                const newValue = e.target.value;
                
                // Update local state immediately for responsive UI
                setPageInputValues(prev => ({ ...prev, [inputKey]: newValue }));
                
                console.log('🔍 Rearrange input change:', newValue);
                
                // Parse the input to extract page order
                const order = newValue
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
      }

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
                  className="input-field"
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

            <div className="info-box">
              <div className="info-box-content">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Archive className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="info-box-title">Compression Information</h4>
                    <div className="info-box-text space-y-1">
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
                <p className="text-gray-500 mb-2">Upload an image (PNG, JPG, SVG, WebP)</p>
                {rule.imageFileName ? (
                  <div className="mb-2">
                    <span className="text-green-600 font-medium">✓ {rule.imageFileName}</span>
                  </div>
                ) : null}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && selectedRuleId === rule.id && handleImageUpload(rule.id, e.target.files)}
                />
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => triggerImageUpload(rule.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {rule.imageFileName ? 'Change Image' : 'Select Image'}
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

      case 'crop_pages': {
        const inputKey = `${rule.id}_pages`;
        const currentInputValue = pageInputValues[inputKey] || rule.pages?.join(',') || '';
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Crop
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 or 1-3,7 (leave empty for all pages)"
                className="input-field"
                value={currentInputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  // Update local state immediately for responsive UI
                  setPageInputValues(prev => ({ ...prev, [inputKey]: newValue }));
                  
                  console.log('🔍 Crop input change:', newValue);
                  
                  // Parse the input to extract page numbers and ranges
                  const pages: number[] = [];
                  const parts = newValue.split(',');
                  
                  for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.includes('-')) {
                      // Handle range (e.g., "1-5")
                      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                      if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                    } else {
                      // Handle single page
                      const pageNum = parseInt(trimmed);
                      if (!isNaN(pageNum) && !pages.includes(pageNum)) {
                        pages.push(pageNum);
                      }
                    }
                  }
                  
                  // Sort pages in ascending order
                  pages.sort((a, b) => a - b);
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
      }

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
                    className="input-field w-12"
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
                  className="input-field"
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

      case 'add_border': {
        const inputKey = `${rule.id}_pages`;
        const currentInputValue = pageInputValues[inputKey] || rule.pages?.join(',') || '';
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Add Border
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 or 1-3,7 (leave empty for all pages)"
                className="input-field"
                value={currentInputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  // Update local state immediately for responsive UI
                  setPageInputValues(prev => ({ ...prev, [inputKey]: newValue }));
                  
                  console.log('🔍 Border input change:', newValue);
                  
                  // Parse the input to extract page numbers and ranges
                  const pages: number[] = [];
                  const parts = newValue.split(',');
                  
                  for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.includes('-')) {
                      // Handle range (e.g., "1-5")
                      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                      if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                    } else {
                      // Handle single page
                      const pageNum = parseInt(trimmed);
                      if (!isNaN(pageNum) && !pages.includes(pageNum)) {
                        pages.push(pageNum);
                      }
                    }
                  }
                  
                  // Sort pages in ascending order
                  pages.sort((a, b) => a - b);
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
      }

      case 'resize_pages': {
        const inputKey = `${rule.id}_pages`;
        const currentInputValue = pageInputValues[inputKey] || rule.pages?.join(',') || '';
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Resize
              </label>
              <input
                type="text"
                placeholder="e.g., 1,2,5 or 1-3,7 (leave empty for all pages)"
                className="input-field"
                value={currentInputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  // Update local state immediately for responsive UI
                  setPageInputValues(prev => ({ ...prev, [inputKey]: newValue }));
                  
                  console.log('🔍 Resize input change:', newValue);
                  
                  // Parse the input to extract page numbers and ranges
                  const pages: number[] = [];
                  const parts = newValue.split(',');
                  
                  for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.includes('-')) {
                      // Handle range (e.g., "1-5")
                      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                      if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                    } else {
                      // Handle single page
                      const pageNum = parseInt(trimmed);
                      if (!isNaN(pageNum) && !pages.includes(pageNum)) {
                        pages.push(pageNum);
                      }
                    }
                  }
                  
                  // Sort pages in ascending order
                  pages.sort((a, b) => a - b);
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
      }

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

      case 'remove_password':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                placeholder="Enter current PDF password"
                className="input-field"
                value={rule.currentPassword || ''}
                onChange={(e) => updateRule(rule.id, { currentPassword: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the current password to verify access to the PDF
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Remove Password Options
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`remove-user-password-${rule.id}`}
                    checked={rule.removeUserPassword || false}
                    onChange={(e) => updateRule(rule.id, { removeUserPassword: e.target.checked })}
                    className="checkbox"
                  />
                  <label htmlFor={`remove-user-password-${rule.id}`} className="text-sm text-gray-700">
                    Remove User Password (Document opening password)
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`remove-owner-password-${rule.id}`}
                    checked={rule.removeOwnerPassword || false}
                    onChange={(e) => updateRule(rule.id, { removeOwnerPassword: e.target.checked })}
                    className="checkbox"
                  />
                  <label htmlFor={`remove-owner-password-${rule.id}`} className="text-sm text-gray-700">
                    Remove Owner Password (Permissions password)
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <KeyRound className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Password Removal Info</p>
                  <ul className="text-xs space-y-1">
                    <li>• <strong>User Password:</strong> Allows anyone to open the PDF without a password</li>
                    <li>• <strong>Owner Password:</strong> Removes restrictions on printing, editing, copying, etc.</li>
                    <li>• <strong>Both Options:</strong> Can be selected to completely remove all password protection</li>
                    <li>• <strong>Security:</strong> Ensure you have authorization to remove password protection</li>
                  </ul>
                </div>
              </div>
            </div>

            {(!rule.removeUserPassword && !rule.removeOwnerPassword) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Selection Required</p>
                    <p>Please select at least one password type to remove (User Password or Owner Password).</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'convert_to_word':
        return (
          <div className="space-y-6">
            {/* Word Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Word Format</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'docx', label: 'DOCX (Recommended)', description: 'Modern Word format with better compatibility' },
                  { value: 'doc', label: 'DOC (Legacy)', description: 'Compatible with older Word versions' }
                ].map((format) => (
                  <label key={format.value} className="relative">
                    <input
                      type="radio"
                      name={`wordFormat-${rule.id}`}
                      value={format.value}
                      checked={rule.wordFormat === format.value}
                      onChange={(e) => updateRule(rule.id, { wordFormat: e.target.value as 'docx' | 'doc' })}
                      className="sr-only"
                    />
                    <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      rule.wordFormat === format.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs text-gray-500">{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Conversion Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Conversion Quality</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'fast', label: 'Fast', description: 'Quick conversion with good quality' },
                  { value: 'medium', label: 'Medium Quality', description: 'Balanced speed and formatting' },
                  { value: 'high', label: 'High Quality', description: 'Best accuracy, slower processing' }
                ].map((quality) => (
                  <label key={quality.value} className="relative">
                    <input
                      type="radio"
                      name={`quality-${rule.id}`}
                      value={quality.value}
                      checked={rule.conversionQuality === quality.value}
                      onChange={(e) => updateRule(rule.id, { conversionQuality: e.target.value as 'fast' | 'medium' | 'high' })}
                      className="sr-only"
                    />
                    <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      rule.conversionQuality === quality.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-sm">{quality.label}</div>
                      <div className="text-xs text-gray-500">{quality.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">Advanced Options</h4>
              
              {/* Preserve Layout */}
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={rule.preserveLayout || false}
                  onChange={(e) => updateRule(rule.id, { preserveLayout: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Preserve Layout</span>
                  <p className="text-xs text-gray-500">Maintain original document formatting and positioning</p>
                </div>
              </label>

              {/* Extract Images */}
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={rule.extractImages || false}
                  onChange={(e) => updateRule(rule.id, { extractImages: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Extract Images</span>
                  <p className="text-xs text-gray-500">Include images from the PDF in the Word document</p>
                </div>
              </label>

              {/* Convert Tables */}
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={rule.convertTables || false}
                  onChange={(e) => updateRule(rule.id, { convertTables: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Convert Tables</span>
                  <p className="text-xs text-gray-500">Convert PDF tables to editable Word tables</p>
                </div>
              </label>
            </div>

            {/* OCR Language for Scanned PDFs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OCR Language (for scanned PDFs)</label>
              <select
                className="input-field"
                value={rule.ocrLanguage || 'eng'}
                onChange={(e) => updateRule(rule.id, { ocrLanguage: e.target.value as typeof rule.ocrLanguage })}
              >
                <option value="eng">English</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
                <option value="ita">Italian</option>
                <option value="por">Portuguese</option>
                <option value="rus">Russian</option>
                <option value="chi_sim">Chinese (Simplified)</option>
                <option value="chi_tra">Chinese (Traditional)</option>
                <option value="jpn">Japanese</option>
                <option value="kor">Korean</option>
                <option value="ara">Arabic</option>
                <option value="hin">Hindi</option>
                <option value="auto">Auto-detect</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the primary language for OCR text recognition in scanned documents
              </p>
            </div>

            {/* Page Range for Conversion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Page Range (Optional)</label>
              <input
                type="text"
                placeholder="e.g., 1-5 or leave empty for all pages"
                className="input-field"
                value={
                  rule.conversionPageRange 
                    ? `${rule.conversionPageRange.start}-${rule.conversionPageRange.end}`
                    : ''
                }
                onChange={(e) => {
                  const value = e.target.value.trim();
                  if (!value) {
                    updateRule(rule.id, { conversionPageRange: undefined });
                  } else {
                    const match = value.match(/^(\d+)-(\d+)$/);
                    if (match) {
                      const start = parseInt(match[1]);
                      const end = parseInt(match[2]);
                      updateRule(rule.id, { conversionPageRange: { start, end } });
                    }
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Specify page range to convert (e.g., 1-5). Leave empty to convert all pages.
              </p>
            </div>

            {/* Conversion Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <FileDown className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">High-Accuracy Conversion</p>
                  <p>Our advanced conversion engine preserves formatting, fonts, and layout while creating fully editable Word documents.</p>
                  {rule.conversionQuality === 'high' && (
                    <p className="mt-2 text-xs text-blue-700">High quality selected - processing may take longer for complex documents.</p>
                  )}
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
    <div className="glass-strong animate-fade-in-up">
      <div className="relative overflow-hidden rounded-t-xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-indigo-600/20" />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
        
        {/* Header Content */}
        <div className="relative p-6 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg flex-shrink-0">
                <Settings className="h-6 w-6 text-indigo-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-1 truncate">
                  Transformation Rules
                </h2>
                <p className="text-gray-700 text-sm font-medium line-clamp-2">
                  Configure how you want to transform your PDF
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={addRule}
                className="btn-primary group relative overflow-hidden whitespace-nowrap"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90 duration-300" />
                  <span>Add Rule</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full transform translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full transform -translate-x-12 translate-y-12" />
      </div>

      {/* Enhanced Category-based Transformation Selector */}
      {rules.length === 0 ? (
        <div className="p-6 space-y-8">
          <div className="text-center py-8">
            <div className="w-20 h-20 glass-strong rounded-2xl flex items-center justify-center mx-auto mb-6 group hover-lift cursor-pointer">
              <Settings className="h-10 w-10 text-indigo-600 group-hover:text-purple-600 transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Start with a transformation</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Choose from our comprehensive set of PDF transformation tools to get started
            </p>
          </div>

          {/* Category Grid */}
          <div className="space-y-8">
            {['Page Operations', 'Document Management', 'Content & Annotations', 'Security & Privacy'].map((category) => {
              const categoryTypes = transformationTypes.filter(type => type.category === category);
              
              const categoryIcons: Record<string, string> = {
                'Page Operations': '📄',
                'Document Management': '📁', 
                'Content & Annotations': '✨',
                'Security & Privacy': '🔒'
              };
              
              return (
                <div key={category} className="space-y-4 animate-fade-in-up">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl" />
                    <div className="relative glass p-4 rounded-xl border border-white/20">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{categoryIcons[category]}</span>
                        <div className="h-px bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 flex-1" />
                        <h3 className="font-bold text-gray-900 px-4 text-lg">{category}</h3>
                        <div className="h-px bg-gradient-to-l from-pink-200 via-purple-200 to-indigo-200 flex-1" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTypes.map((type) => {
                      const IconComponent = type.icon;
                      
                      return (
                        <button
                          key={type.value}
                          onClick={() => addRuleWithType(type.value)}
                          className="group relative overflow-hidden glass-strong p-6 rounded-xl hover-lift transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 hover:shadow-xl hover:shadow-purple-500/25"
                        >
                          {/* Gradient background on hover */}
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          <div className="relative flex items-start space-x-4">
                            <div className="p-3 glass rounded-xl border border-white/30 group-hover:border-purple-300/50 transition-all duration-300 group-hover:shadow-lg">
                              <IconComponent className="h-6 w-6 text-indigo-600 group-hover:text-purple-600 transition-colors duration-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 group-hover:text-purple-900 text-base mb-2 transition-colors duration-300">
                                {type.label}
                              </h4>
                              <p className="text-sm text-gray-600 group-hover:text-purple-700 leading-relaxed transition-colors duration-300">
                                {type.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* Decorative corner element */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/20 to-transparent rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
        <div className="p-6 space-y-6">
          {rules.map((rule, index) => {
            const typeConfig = getTypeConfig(rule.type);
            const IconComponent = typeConfig.icon;
            
            return (
              <div key={rule.id} className="glass-strong rounded-xl animate-fade-in-up hover-lift transition-all duration-300 overflow-hidden">
                {/* Rule Header */}
                <div className="relative bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 glass rounded-full flex items-center justify-center border border-white/30 text-sm font-bold text-indigo-600">
                        {index + 1}
                      </div>
                      <div className="p-3 glass rounded-xl border border-white/30">
                        <IconComponent className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => openTransformationModal(rule.id)}
                          className="w-full p-4 glass rounded-xl border border-white/30 hover:border-purple-300/50 hover:shadow-lg transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <IconComponent className="h-5 w-5 text-purple-600" />
                              <span className="font-bold text-gray-900 group-hover:text-purple-900 transition-colors duration-300">{typeConfig.label}</span>
                            </div>
                            <ArrowUpDown className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors duration-300" />
                          </div>
                        </button>
                        <p className="text-sm text-gray-600 mt-2 px-4">{typeConfig.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="p-3 glass rounded-xl border border-white/30 text-gray-400 hover:text-red-600 hover:border-red-300/50 hover:bg-red-50/50 transition-all duration-300 group"
                      title="Remove rule"
                    >
                      <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
                
                {/* Rule Configuration */}
                <div className="p-6 bg-white/50 backdrop-blur-sm">
                  {renderRuleFields(rule)}
                </div>
              </div>
            );
          })}
          
          {/* Add Another Rule Button */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-xl" />
            <button
              onClick={addRule}
              className="relative w-full p-6 glass border-2 border-dashed border-indigo-300/50 rounded-xl hover:border-purple-400/70 hover:bg-gradient-to-br hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-300 group hover-lift"
            >
              <div className="flex items-center justify-center space-x-3 text-gray-600 group-hover:text-purple-600">
                <div className="p-2 glass rounded-xl border border-white/30 group-hover:border-purple-300/50 transition-all duration-300">
                  <Plus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-300" />
                </div>
                <span className="font-bold text-lg">Add Another Transformation</span>
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