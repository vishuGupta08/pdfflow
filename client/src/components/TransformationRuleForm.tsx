import { Plus, Trash2, Settings, RotateCw, Shield, Eye, Hash, Scissors, ArrowUpDown, Archive } from 'lucide-react';
import type { TransformationRule } from '../types';

interface TransformationRuleFormProps {
  rules: TransformationRule[];
  onRulesChange: (rules: TransformationRule[]) => void;
}

const transformationTypes = [
  { value: 'remove_pages', label: 'Remove Pages', icon: Scissors, description: 'Delete specific pages from your PDF' },
  { value: 'rotate_pages', label: 'Rotate Pages', icon: RotateCw, description: 'Rotate pages by 90°, 180°, or 270°' },
  { value: 'add_watermark', label: 'Add Watermark', icon: Shield, description: 'Add text watermark to all pages' },
  { value: 'redact_text', label: 'Redact Text', icon: Eye, description: 'Hide sensitive information' },
  { value: 'add_page_numbers', label: 'Add Page Numbers', icon: Hash, description: 'Number your pages automatically' },
  { value: 'extract_pages', label: 'Extract Pages', icon: Scissors, description: 'Extract a range of pages' },
  { value: 'rearrange_pages', label: 'Rearrange Pages', icon: ArrowUpDown, description: 'Change the order of pages' },
  { value: 'compress', label: 'Compress PDF', icon: Archive, description: 'Reduce file size' },
] as const;

export const TransformationRuleForm: React.FC<TransformationRuleFormProps> = ({
  rules,
  onRulesChange
}) => {
  const addRule = () => {
    const newRule: TransformationRule = {
      id: Date.now().toString(),
      type: 'remove_pages'
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

      case 'compress':
        return (
          <div className="text-center p-6 bg-gradient-to-r from-primary-50 to-primary-25 rounded-xl">
            <Archive className="h-12 w-12 text-primary-600 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">PDF Compression</h4>
            <p className="text-sm text-gray-600">
              This will automatically optimize your PDF file size without additional settings.
            </p>
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

      {rules.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transformation rules yet</h3>
          <p className="text-gray-600 mb-6">Add your first transformation rule to get started</p>
          <button
            onClick={addRule}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Rule
          </button>
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
                      <select
                        className="select-field font-medium"
                        value={rule.type}
                        onChange={(e) => updateRule(rule.id, { type: e.target.value as TransformationRule['type'] })}
                      >
                        {transformationTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
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
        </div>
      )}
    </div>
  );
}; 