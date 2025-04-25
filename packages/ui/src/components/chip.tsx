import { useState } from 'react';

import { cn } from './../lib/utils';

type ChipItem = {
  value?: string;
  label?: string;
  selected?: boolean;
};

type ChipProps = ChipItem & {
  children?: React.ReactNode;
  onClick?: (value: string) => void;
};

export const Chip: React.FC<ChipProps> = ({
  children = <></>,
  label,
  value,
  selected = false,
  onClick,
}) => {
  const handleClick = () => {
    if (value && onClick) {
      onClick(value);
    }
  };

  return (
    <div
      className={cn(
        'transition-all w-auto min-w-[100px] py-3 px-4 bg-transparent border-2 border-solid rounded-lg hover:cursor-pointer text-sm font-normal',
        selected ? 'border-black' : 'border-gray-200',
      )}
      onClick={handleClick}
    >
      {label ? label : children}
    </div>
  );
};

type ChipGroupProps = {
  children?: React.ReactNode;
  value?: string;
  items?: ChipItem[];
  className?: string;
  onSelect?: (value: string) => void;
};

export const ChipGroup: React.FC<ChipGroupProps> = ({
  value,
  items = [],
  className,
  onSelect,
}) => {
  const handleSelect = (value?: string) => {
    if (!value) return;
    if (onSelect) {
      onSelect(value);
    }
  };
  return (
    <div className={cn('flex flex-row gap-2', className)}>
      {items.map((chip, key) => (
        <Chip
          key={key}
          {...chip}
          selected={value === chip.value}
          onClick={() => handleSelect(chip.value)}
        />
      ))}
    </div>
  );
};
