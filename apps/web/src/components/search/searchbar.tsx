'use client';

import { MagnifyingGlassIcon } from '@repo/ui';
import { Input, Spinner } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

type Props = {
  className?: string;
  value?: string;
  results?: {
    id: string;
    name: string;
    context?: string;
  }[];
  loading?: boolean;
  onChange?: (query: string) => void;
  onSubmit?: (query: string) => void;
  onResultClick?: (id: string) => void;
  inputProps?: React.ComponentProps<'input'>;
};

export const SEARCHBAR_CUSTOM_ITEM_ID = 'search';

export const Searchbar: React.FC<Props> = ({
  className,
  loading = false,
  value,
  results = [],
  onChange,
  onSubmit,
  onResultClick,
  inputProps,
}) => {
  const [search, setSearch] = useState<string | undefined>();
  const [focused, setFocused] = useState(false);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (onChange) {
      onChange(value);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!value) return;
    if (onSubmit) {
      onSubmit(value);
    }
  };

  const handleFocusIn = () => {
    setFocused(true);
  };

  const handleFocusOut = () => {
    setTimeout(() => {
      setFocused(false);
    }, 200);
  };

  return (
    <div className="w-full flex flex-col relative">
      <form method="POST" onSubmit={handleSubmit}>
        <div className="relative w-full flex flex-row justify-start items-center">
          <div className="absolute left-0 top-0 bottom-0 w-[36px] flex items-center justify-center">
            {loading ? (
              <Spinner size={16} className="text-gray-500" />
            ) : (
              <MagnifyingGlassIcon
                size={16}
                weight="bold"
                className="text-gray-600"
              />
            )}
          </div>
          <Input
            className={cn('pl-[32px] rounded-full bg-background', className)}
            value={search}
            placeholder="Search"
            onChange={handleChange}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            {...inputProps}
          />
        </div>
      </form>
      {search && focused && (
        <div
          className={cn(
            'z-40 absolute top-[45px] bg-white rounded-xl shadow-lg w-full h-auto max-h-[380px] overflow-y-scroll',
          )}
        >
          <div className="w-full flex flex-col p-1">
            {results.map(({ id, name, context }, key) => (
              <div
                key={key}
                className={cn(
                  'h-[50px] cursor-pointer hover:bg-accent px-4 box-border flex rounded-xl',
                  id === SEARCHBAR_CUSTOM_ITEM_ID
                    ? 'flex-row justify-start items-center gap-2'
                    : 'flex-col items-start justify-center',
                )}
                onClick={onResultClick ? () => onResultClick(id) : undefined}
              >
                {id === SEARCHBAR_CUSTOM_ITEM_ID ? (
                  <>
                    <MagnifyingGlassIcon size={18} weight="bold" />
                    <span className="text-sm font-medium text-black">
                      {name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-black">
                      {name}
                    </span>
                    {context && (
                      <span className="text-xs text-gray-500">{context}</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
