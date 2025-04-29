import { cn } from './../lib/utils';

type ChipItem = {
  value?: string;
  label?: string;
  icon?: () => JSX.Element;
  selected?: boolean;
};

type ChipProps = ChipItem & {
  children?: React.ReactNode;
  className?: string;
  onClick?: (value: string) => void;
};

export const Chip: React.FC<ChipProps> = ({
  children = <></>,
  label,
  value,
  icon: Icon,
  className,
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
        'transition-all w-auto min-w-[100px] py-3 px-4 bg-transparent border-2 border-solid rounded-lg cursor-pointer text-sm font-medium',
        selected ? 'border-black text-black' : 'border-gray-200 text-gray-600',
        className,
      )}
      onClick={handleClick}
    >
      <div className="flex flex-row items-center gap-3">
        {Icon ? <Icon /> : <></>}
        <span>{label}</span>
      </div>
    </div>
  );
};

type ChipGroupProps = {
  children?: React.ReactNode;
  value?: string;
  items?: ChipItem[];
  className?: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
};

export const ChipGroup: React.FC<ChipGroupProps> = ({
  value,
  items = [],
  className,
  disabled = false,
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
          className={cn(disabled ? 'cursor-default' : 'cursor-pointer')}
          selected={value === chip.value}
          onClick={disabled ? () => {} : () => handleSelect(chip.value)}
        />
      ))}
    </div>
  );
};
