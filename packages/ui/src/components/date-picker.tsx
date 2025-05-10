'use client';

import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from './../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type Props = {
  format: (date: Date) => string;
  date?: Date;
  onChange?: (date: Date) => void;
  disabled?: boolean;
  inputProps?: React.ComponentProps<'input'>;
};

export const DatePicker: React.FC<Props> = ({
  date,
  format,
  onChange,
  disabled = false,
  inputProps,
}) => {
  const handleSelect = (date?: Date) => {
    if (date && onChange) {
      onChange(date);
    }
  };

  return (
    <Popover>
      <PopoverTrigger disabled={disabled}>
        <div className="relative flex flex-row">
          <div className="absolute left-0 top-0 bottom-0 w-[40px] flex flex-row items-center justify-center">
            <CalendarIcon
              size={16}
              className={cn(disabled ? 'text-gray-500' : 'text-black')}
            />
          </div>
          <Input
            value={date ? format(date) : 'dd/mm/yyyy'}
            className={cn(
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
              'pl-9',
            )}
            disabled={disabled}
            {...inputProps}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
