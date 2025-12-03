'use client';

import { Label } from '@repo/ui/components';
import { useTheme } from '@/contexts';

export const UserSettingsDisplayView: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', description: 'Always use light mode' },
    { value: 'dark', label: 'Dark', description: 'Always use dark mode' },
    { value: 'system', label: 'System', description: 'Follow system settings' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-medium mb-1">Appearance</h3>
          <p className="text-sm text-gray-400">
            Customize how Heimursaga looks on your device
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium">Theme</Label>
          <div className="grid gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                className={`
                  relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all
                  ${
                    theme === option.value
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center h-6">
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${
                        theme === option.value
                          ? 'border-primary'
                          : 'border-gray-300'
                      }
                    `}
                  >
                    {theme === option.value && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
