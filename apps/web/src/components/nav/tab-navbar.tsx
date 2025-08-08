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
};

export const TabNavbar: React.FC<Props> = ({
  tabs,
  activeTab,
  classNames,
  onChange,
}) => {
  const handleClick = (tab: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (activeTab !== tab) {
      if (onChange) {
        onChange(tab);
      }
    }
  };

  return (
    <div
      className={cn(
        'w-full flex  flex-row justify-center items-center border-b-[1.5px] border-solid border-gray-200',
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
              'w-auto flex flex-col items-center gap-2 font-medium justify-start text-sm text-left rounded-none',
              disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'hover:text-black',
              activeTab === tab ? 'text-black' : disabled ? 'text-gray-400' : 'text-black/70',
            )}
            onClick={() => handleClick(tab, disabled)}
            disabled={disabled}
          >
            <span>{label}</span>
            <span
              className={cn(
                'h-[2px] w-[75%]',
                activeTab === tab ? 'bg-black' : 'bg-transparent',
              )}
            ></span>
          </button>
        ))}
      </div>
    </div>
  );
};
