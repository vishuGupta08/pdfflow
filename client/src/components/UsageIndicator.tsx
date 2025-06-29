import React from 'react';
import { AlertTriangle, Zap, TrendingUp } from 'lucide-react';

interface UsageIndicatorProps {
  currentUsage: number;
  maxUsage: number;
  planName: string;
  label: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({
  currentUsage,
  maxUsage,
  planName,
  label,
  showUpgrade = false,
  onUpgrade
}) => {
  const percentage = Math.min((currentUsage / maxUsage) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getStatusColor = () => {
    if (isAtLimit) return 'text-error-600';
    if (isNearLimit) return 'text-warning-600';
    return 'text-success-600';
  };

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-error-500';
    if (isNearLimit) return 'bg-warning-500';
    return 'bg-primary-500';
  };

  const getBackgroundColor = () => {
    if (isAtLimit) return 'bg-error-50 border-error-200';
    if (isNearLimit) return 'bg-warning-50 border-warning-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Zap className={`h-4 w-4 ${getStatusColor()}`} />
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {currentUsage}/{maxUsage}
          </span>
          {isAtLimit && <AlertTriangle className="h-4 w-4 text-error-500" />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status Messages */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 capitalize">{planName} Plan</span>
        
        {(showUpgrade && (isAtLimit || isNearLimit)) && (
          <button
            onClick={onUpgrade}
            className="inline-flex items-center space-x-1 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            <TrendingUp className="h-3 w-3" />
            <span>Upgrade</span>
          </button>
        )}
      </div>

      {/* Warning Messages */}
      {isAtLimit && (
        <div className="mt-2 text-xs text-error-600 font-medium">
          Limit reached! Upgrade to continue.
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="mt-2 text-xs text-warning-600 font-medium">
          Approaching limit. Consider upgrading soon.
        </div>
      )}
    </div>
  );
}; 