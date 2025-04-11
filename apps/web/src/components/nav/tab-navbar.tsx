'use client';

import { cn } from '@repo/ui/lib/utils';

type Props = {
  tabs: {
    label: string;
    key: string;
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
  const handleClick = (tab: string) => {
    if (onChange) {
      onChange(tab);
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
        {tabs.map(({ label, key: tab }, key) => (
          <button
            key={key}
            className={cn(
              'w-auto flex flex-col items-center gap-2 font-medium justify-start text-sm text-left hover:text-black rounded-none',
              activeTab === tab ? 'text-black' : 'text-black/70',
            )}
            onClick={() => handleClick(tab)}
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
