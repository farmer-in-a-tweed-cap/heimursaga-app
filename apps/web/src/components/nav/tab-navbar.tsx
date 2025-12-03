'use client';

import { cn } from '@repo/ui/lib/utils';

type Props = {
  tabs: {
    label: string;
    key: string;
    disabled?: boolean;
  }[];
  activeTab: string;
  classNames?: {
    container?: string;
    tabs?: string;
  };
  onChange?: (tab: string) => void;
  isLoading?: boolean;
};

export const TabNavbar: React.FC<Props> = ({
  tabs,
  activeTab,
  classNames,
  onChange,
  isLoading = false,
}) => {
  const handleClick = (tab: string, disabled?: boolean) => {
    if (disabled || isLoading) return;
    
    if (activeTab !== tab) {
      if (onChange) {
        onChange(tab);
      }
    }
  };

  return (
    <div
      className={cn(
        'w-full flex  flex-row justify-center items-center border-b-[1.5px] border-solid border-gray-200 dark:border-gray-700',
        classNames?.container,
      )}
    >
      <div
        className={cn(
          'flex flex-row justify-center items-center gap-6',
          classNames?.tabs,
        )}
      >
        {tabs.map(({ label, key: tab, disabled }, key) => (
          <button
            key={key}
            className={cn(
              'w-auto flex flex-col items-center gap-2 font-medium justify-start text-sm text-left rounded-none transition-opacity',
              disabled || isLoading
                ? 'text-gray-400 cursor-not-allowed'
                : 'hover:text-black dark:hover:text-white',
              activeTab === tab ? 'text-black dark:text-white' : (disabled || isLoading) ? 'text-gray-400' : 'text-black/70 dark:text-gray-400',
              isLoading && 'opacity-50'
            )}
            onClick={() => handleClick(tab, disabled)}
            disabled={disabled || isLoading}
          >
            <span>{label}</span>
            <span
              className={cn(
                'h-[2px] w-[75%]',
                activeTab === tab ? 'bg-black dark:bg-white' : 'bg-transparent',
              )}
            ></span>
          </button>
        ))}
      </div>
    </div>
  );
};
