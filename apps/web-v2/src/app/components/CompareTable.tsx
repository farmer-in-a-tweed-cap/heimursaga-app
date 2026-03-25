'use client';

import { CheckCircle, XCircle, Minus } from 'lucide-react';

export type CompareRow = {
  feature: string;
  a: boolean | 'partial';
  b: boolean | 'partial';
  note?: string;
};

function StatusIcon({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <CheckCircle className="w-4 h-4 text-[#598636]" />;
  if (value === 'partial') return <Minus className="w-4 h-4 text-[#ac6d46]" />;
  return <XCircle className="w-4 h-4 text-[#b5bcc4]" />;
}

function StatusLabel({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <span className="text-[#598636] font-semibold">Yes</span>;
  if (value === 'partial') return <span className="text-[#ac6d46] font-semibold">Partial</span>;
  return <span className="text-[#b5bcc4]">No</span>;
}

export function CompareTable({
  rows,
  headerA,
  headerB,
}: {
  rows: CompareRow[];
  headerA: string;
  headerB: string;
}) {
  return (
    <>
      {/* Desktop: table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#202020] dark:border-[#616161]">
              <th className="text-left py-3 pr-4 text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider"></th>
              <th className="text-center py-3 px-4 text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider w-[100px]">{headerA}</th>
              <th className="text-center py-3 pl-4 text-xs font-bold text-[#ac6d46] uppercase tracking-wider w-[100px]">{headerB}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#b5bcc4]/30 dark:divide-[#616161]/30">
            {rows.map((row) => (
              <tr key={row.feature}>
                <td className="py-3 pr-4 text-[#202020] dark:text-[#e5e5e5]">
                  <span className="font-semibold">{row.feature}</span>
                  {row.note && <span className="block text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-0.5">{row.note}</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  <StatusIcon value={row.a} />
                </td>
                <td className="py-3 pl-4 text-center">
                  <StatusIcon value={row.b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked card layout */}
      <div className="sm:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={row.feature}
            className="border border-[#b5bcc4]/40 dark:border-[#616161]/40 p-3"
          >
            <div className="font-semibold text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
              {row.feature}
            </div>
            {row.note && (
              <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mb-2">{row.note}</div>
            )}
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <StatusIcon value={row.a} />
                <span className="text-[#616161] dark:text-[#b5bcc4]">{headerA}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusIcon value={row.b} />
                <span className="text-[#ac6d46]">{headerB}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Fee comparison table — text in all columns, needs different mobile treatment */
export function FeeTable({
  rows,
  headerA,
  headerB,
}: {
  rows: Array<{ label: string; a: string; b: string; aColor?: string; bColor?: string }>;
  headerA: string;
  headerB: string;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#202020] dark:border-[#616161]">
              <th className="text-left py-3 pr-4 text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider"></th>
              <th className="text-left py-3 px-4 text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider">{headerA}</th>
              <th className="text-left py-3 pl-4 text-xs font-bold text-[#ac6d46] uppercase tracking-wider">{headerB}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#b5bcc4]/30 dark:divide-[#616161]/30">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 pr-4 font-semibold text-[#202020] dark:text-[#e5e5e5]">{row.label}</td>
                <td className={`py-3 px-4 ${row.aColor || 'text-[#202020] dark:text-[#e5e5e5]'}`}>{row.a}</td>
                <td className={`py-3 pl-4 ${row.bColor || 'text-[#202020] dark:text-[#e5e5e5]'}`}>{row.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked */}
      <div className="sm:hidden space-y-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border border-[#b5bcc4]/40 dark:border-[#616161]/40 p-3"
          >
            <div className="font-semibold text-sm text-[#202020] dark:text-[#e5e5e5] mb-2">
              {row.label}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">{headerA}</span>
                <span className={row.aColor || 'text-[#202020] dark:text-[#e5e5e5]'}>{row.a}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#ac6d46]">{headerB}</span>
                <span className={row.bColor || 'text-[#202020] dark:text-[#e5e5e5]'}>{row.b}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
