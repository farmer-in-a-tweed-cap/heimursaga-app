import * as React from 'react';

import { cn } from './../lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus:ring-black focus:ring-2 focus-visible:border-ring focus-visible:ring-ring/50',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

function NumberInput({
  className,
  maxLength = 10,
  min = 0,
  max = 1000,
  leftElement,
  onChange,
  ...props
}: React.ComponentProps<'input'> & {
  maxLength?: number;
  leftElement?: string;
}) {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    let value = e.target.value;

    // remove leading zeros unless the value is exactly "0"
    if (value.startsWith('0') && value !== '0') {
      value = value.replace(/^0+/, '');
    }

    // handle empty input
    if (value === '') {
      e.target.value = '';
      if (onChange) {
        onChange(e);
      }
      return;
    }

    // check if the value exceeds maxLength
    if (value.length > maxLength) {
      value = value.slice(0, maxLength);
      e.target.value = value;
    }

    // update the input value
    e.target.value = value;

    if (onChange) {
      onChange(e);
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    let value = e.target.value;

    // Hhndle empty input on blur (optional: set to min or leave empty)
    if (value === '') {
      if (typeof min === 'number') {
        value = min.toString();
        e.target.value = value;
      }
    } else {
      // enforce min value on blur
      const numericValue = parseFloat(value);
      if (
        typeof min === 'number' &&
        !isNaN(numericValue) &&
        numericValue < min
      ) {
        value = min.toString();
        e.target.value = value;
      }
    }

    // trigger onChange to notify parent of the final value
    if (onChange) {
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className="relative w-full flex">
      {leftElement && (
        <div className="absolute left-0 top-0 bottom-0 w-[36px] bg-transparent border border-solid border-input z-20 flex items-center justify-center text-sm font-medium rounded-l-md">
          <span>$</span>
        </div>
      )}
      <input
        type="number"
        data-slot="input"
        className={cn(
          'z-10 border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className,
          leftElement ? '!pl-12' : '',
        )}
        min={min}
        max={max}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    </div>
  );
}

export { Input, NumberInput };
