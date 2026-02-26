'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export function ActiveExpeditionBanner() {
  const { user } = useAuth();
  if (!user?.activeExpedition) return null;

  const { publicId, title } = user.activeExpedition;

  return (
    <Link
      href={`/expedition/${publicId}`}
      className="block bg-[#ac6d46] text-white hover:bg-[#9a6140] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center text-sm font-mono gap-2">
        <span className="truncate min-w-0">
          Active Expedition: <span className="font-bold">{title}</span>
        </span>
        <span className="shrink-0 opacity-75">&rarr;</span>
      </div>
    </Link>
  );
}
