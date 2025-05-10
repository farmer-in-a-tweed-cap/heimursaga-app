import { Input, LoadingSpinner, Spinner } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

type Props = {
  className?: string;
  value?: string;
  loading?: boolean;
  onChange?: (query: string) => void;
  onSubmit: (query: string) => void;
  inputProps?: React.ComponentProps<'input'>;
};

export const Searchbar: React.FC<Props> = ({
  className,
  loading = false,
  value,
  onChange,
  onSubmit,
  inputProps,
}) => {
  const [search, setSearch] = useState<string | undefined>();

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;

    setSearch(value);

    if (onChange) {
      onChange(value);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    if (!search) return;

    if (onSubmit) {
      onSubmit(search);
    }
  };

  return (
    <form method="POST" onSubmit={handleSubmit}>
      <div className="relative w-full flex flex-row justify-start items-center">
        <div className="absolute left-0 top-0 bottom-0 w-[36px] flex items-center justify-center">
          {loading ? (
            <Spinner size={16} className="text-gray-500" />
          ) : (
            <SearchIcon size={16} className="text-gray-600" />
          )}
        </div>
        <Input
          className={cn('pl-[32px] rounded-full', className)}
          value={value}
          onChange={handleChange}
          {...inputProps}
        />
      </div>
    </form>
  );
};
