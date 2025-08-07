'use client';

import { Input, Spinner } from '@repo/ui/components';
import { MagnifyingGlass, X, User, BookBookmark, MapPin } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useEffect, useState } from 'react';

type Props = {
  className?: string;
  value?: string;
  results?: {
    id: string;
    name: string;
    context?: string;
    type?: 'location' | 'user' | 'entry' | 'text';
  }[];
  clear?: boolean;
  loading?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
  onResultClick?: (id: string) => void;
  inputProps?: React.ComponentProps<'input'>;
};

export const SEARCHBAR_CUSTOM_ITEM_ID = 'search';

export const Searchbar: React.FC<Props> = ({
  className,
  loading = false,
  value,
  results = [],
  clear = false,
  onChange,
  onSubmit,
  onResultClick,
  onClear,
  inputProps,
}) => {
  const [search, setSearch] = useState<string | undefined>(value);
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

  const handleClear = () => {
    setSearch('');

    if (onClear) {
      onClear();
    }
  };

  useEffect(() => {
    if (value) {
      setSearch(value);
    }
  }, [value]);

  return (
    <div className="w-full flex flex-col relative">
      <form method="POST" onSubmit={handleSubmit}>
        <div className="relative w-full flex flex-row justify-start items-center">
          <div className="absolute left-0 top-0 bottom-0 w-[36px] flex items-center justify-center">
            {loading ? (
              <Spinner size={16} className="text-gray-500" />
            ) : (
              <MagnifyingGlass
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
          {clear && (
            <div className="absolute right-0 top-0 bottom-0 w-[36px] flex items-center justify-center">
              <button onClick={handleClear}>
                <X size={16} weight="bold" className="text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </form>
      {search && focused && (
        <div
          className={cn(
            'z-40 absolute top-[45px] bg-white rounded-xl shadow-lg w-full h-auto max-h-[380px] overflow-y-scroll',
          )}
        >
          <div className="w-full flex flex-col p-1">
            {results.map(({ id, name, context, type }, key) => {
              const getIcon = () => {
                if (id === SEARCHBAR_CUSTOM_ITEM_ID || type === 'text') {
                  return <MagnifyingGlass size={18} weight="bold" className="text-gray-600" />;
                }
                switch (type) {
                  case 'user':
                    return <User size={18} weight="bold" style={{ color: '#4676AC' }} />;
                  case 'entry':
                    return <BookBookmark size={18} weight="bold" style={{ color: '#AC6D46' }} />;
                  case 'location':
                    return <MapPin size={18} weight="bold" style={{ color: '#4676AC' }} />;
                  default:
                    return <MagnifyingGlass size={18} weight="bold" className="text-gray-600" />;
                }
              };

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[50px] cursor-pointer hover:bg-accent px-4 box-border flex rounded-xl',
                    'flex-row justify-start items-center gap-3',
                  )}
                  onClick={onResultClick ? () => onResultClick(id) : undefined}
                >
                  {getIcon()}
                  <div className="flex flex-col justify-center flex-1">
                    <span className="text-sm font-medium text-black">
                      {name}
                    </span>
                    {context && (
                      <span className="text-xs text-gray-500">{context}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
