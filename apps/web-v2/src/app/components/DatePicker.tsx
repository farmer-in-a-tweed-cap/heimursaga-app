'use client';

import { useState, useMemo, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/app/components/ui/popover';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

function parseDate(str: string): Date | undefined {
  if (!str) return undefined;
  const d = parse(str, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function formatIso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  className = '',
  placeholder = 'Select date...',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = parseDate(value);
  const minDate = min ? parseDate(min) : undefined;
  const maxDate = max ? parseDate(max) : undefined;

  // Month the calendar is currently viewing — default to selected date, min date, or today
  const [month, setMonthState] = useState<Date>(
    selected || minDate || new Date()
  );

  // When the popover opens, navigate to the selected date or the start of the valid range
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setMonthState(selected || minDate || new Date());
    }
    setOpen(nextOpen);
  }, [selected, minDate]);

  // Year range for the dropdown
  const yearRange = useMemo(() => {
    const currentYear = getYear(new Date());
    const minYear = minDate ? getYear(minDate) : currentYear - 20;
    const maxYear = maxDate ? getYear(maxDate) : currentYear + 20;
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    return years;
  }, [minDate, maxDate]);

  const handleSelect = (day: Date | undefined) => {
    if (!day) return;
    // Reject disabled dates outside min/max range
    if (minDate && day < minDate) return;
    if (maxDate && day > maxDate) return;
    onChange(formatIso(day));
    setOpen(false);
  };

  const handleMonthChange = (newMonth: Date) => {
    setMonthState(newMonth);
  };

  const handleYearChange = (year: number) => {
    setMonthState(prev => setYear(prev, year));
  };

  const handleMonthSelect = (m: number) => {
    setMonthState(prev => setMonth(prev, m));
  };

  const displayValue = selected ? format(selected, 'MMM d, yyyy') : '';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center justify-between text-left font-mono ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${!displayValue ? 'text-[#616161] dark:text-[#b5bcc4]' : ''}`}
        >
          <span className={displayValue ? '' : 'opacity-60'}>
            {displayValue || placeholder}
          </span>
          <Calendar className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4] flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-auto p-0 bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] shadow-lg rounded-none z-[60]"
      >
        {/* Month/Year Navigation Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              const prev = new Date(month);
              prev.setMonth(prev.getMonth() - 1);
              handleMonthChange(prev);
            }}
            className="p-1 text-[#616161] hover:text-[#ac6d46] dark:text-[#b5bcc4] dark:hover:text-[#ac6d46] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            <select
              value={getMonth(month)}
              onChange={(e) => handleMonthSelect(Number(e.target.value))}
              className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] bg-transparent border-none outline-none cursor-pointer hover:text-[#ac6d46] dark:hover:text-[#ac6d46] appearance-none pr-1"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i} className="bg-white dark:bg-[#2a2a2a]">
                  {format(new Date(2000, i, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              value={getYear(month)}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] bg-transparent border-none outline-none cursor-pointer hover:text-[#ac6d46] dark:hover:text-[#ac6d46] appearance-none"
            >
              {yearRange.map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-[#2a2a2a]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = new Date(month);
              next.setMonth(next.getMonth() + 1);
              handleMonthChange(next);
            }}
            className="p-1 text-[#616161] hover:text-[#ac6d46] dark:text-[#b5bcc4] dark:hover:text-[#ac6d46] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={handleMonthChange}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          showOutsideDays
          fixedWeeks
          classNames={{
            months: 'flex flex-col',
            month: 'flex flex-col',
            caption: 'hidden',
            nav: 'hidden',
            table: 'w-full border-collapse',
            head_row: 'flex',
            head_cell: 'w-9 text-center text-xs font-bold text-[#616161] dark:text-[#b5bcc4] pb-1',
            row: 'flex w-full',
            cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
            day: 'w-9 h-9 flex items-center justify-center text-sm text-[#202020] dark:text-[#e5e5e5] hover:bg-[#ac6d46]/10 transition-colors cursor-pointer rounded-none',
            day_selected: 'bg-[#ac6d46] text-white hover:bg-[#ac6d46] font-bold',
            day_today: 'ring-1 ring-inset ring-[#ac6d46] font-bold',
            day_outside: 'text-[#b5bcc4] dark:text-[#616161] opacity-50',
            day_disabled: 'text-[#b5bcc4] dark:text-[#616161] opacity-30 cursor-not-allowed hover:bg-transparent',
            day_hidden: 'invisible',
          }}
          className="px-3 pb-3"
        />

        {/* Today shortcut */}
        <div className="border-t border-[#b5bcc4] dark:border-[#616161] px-3 py-2">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              if (minDate && today < minDate) return;
              if (maxDate && today > maxDate) return;
              onChange(formatIso(today));
              setMonthState(today);
              setOpen(false);
            }}
            className="text-xs font-bold text-[#ac6d46] hover:text-[#8a5738] dark:hover:text-[#c7845a] transition-colors"
          >
            TODAY
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
