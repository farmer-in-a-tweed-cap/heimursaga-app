import { cn } from './../lib/utils';

type ChipItem = {
  value?: string;
  label?: string;
  icon?: () => JSX.Element;
  selected?: boolean;
  disabled?: boolean;
};

type ChipProps = ChipItem & {
  children?: React.ReactNode;
  className?: string;
  onClick?: (_value: string) => void;
};

export const Chip: React.FC<ChipProps> = ({
  label,
  value,
  icon: Icon,
  className,
  selected = false,
  disabled = false,
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
        'transition-all w-auto min-w-[100px] py-3 px-4 flex items-center justify-center bg-transparent border-2 border-solid rounded-lg text-sm font-medium',
        className,
        selected ? 'border-black text-black' : 'border-gray-200 text-gray-600',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
      onClick={disabled ? () => {} : handleClick}
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
  classNames?: {
    group?: string;
    chip?: string;
  };

  disabled?: boolean;
  onSelect?: (_value: string) => void;
};

export const ChipGroup: React.FC<ChipGroupProps> = ({
  value,
  items = [],
  classNames,
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
    <div className={cn('flex flex-row gap-2', classNames?.group)}>
      {items.map((chip, key) => (
        <Chip
          key={key}
          {...chip}
          className={
            (cn(disabled ? 'cursor-not-allowed' : 'cursor-pointer'),
            classNames?.chip)
          }
          selected={value === chip.value}
          onClick={disabled ? () => {} : () => handleSelect(chip.value)}
        />
      ))}
    </div>
  );
};
