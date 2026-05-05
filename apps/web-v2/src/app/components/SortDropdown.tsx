'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SortOption {
  key: string;
  label: string;
}

interface SortDropdownProps {
  value: string;
  options: SortOption[];
  onChange: (key: string) => void;
  className?: string;
}

export function SortDropdown({ value, options, onChange, className }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 whitespace-nowrap font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] text-xs flex items-center gap-1.5"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        SORT: {current.label}
        <ChevronDown size={12} strokeWidth={2.5} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-30 min-w-[180px] bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={opt.key === value}
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-bold font-mono transition-all hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] ${
                opt.key === value
                  ? 'bg-[#4676ac] text-white hover:bg-[#365a87]'
                  : 'text-[#202020] dark:text-[#e5e5e5]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
