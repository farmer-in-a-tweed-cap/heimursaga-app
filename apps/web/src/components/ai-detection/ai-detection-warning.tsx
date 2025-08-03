'use client';

import { Button } from '@repo/ui/components';
import { WarningCircle, X } from '@repo/ui/icons';

interface AIDetectionWarningProps {
  warnings: string[];
  onDismiss: () => void;
  className?: string;
}

export const AIDetectionWarning: React.FC<AIDetectionWarningProps> = ({
  warnings,
  onDismiss,
  className = '',
}) => {
  if (warnings.length === 0) return null;

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <WarningCircle 
          className="text-yellow-600 flex-shrink-0 mt-0.5" 
          size={20} 
          weight="bold" 
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Content Review Notice
          </h3>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <p key={index} className="text-sm text-yellow-700">
                {warning}
              </p>
            ))}
          </div>
          <div className="mt-3 text-xs text-yellow-600">
            Remember: Heimursaga prohibits AI-generated content. All entries must be your original work and authentic experiences.
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-yellow-600 hover:text-yellow-800 p-1 h-auto"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};