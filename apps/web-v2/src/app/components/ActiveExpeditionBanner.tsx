'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export function ActiveExpeditionBanner() {
  const { user } = useAuth();
  if (!user?.activeExpedition) return null;
  // Don't show for guide accounts (blueprints don't have active/planned status)
  if (user.isGuide) return null;

  const { publicId, title, status } = user.activeExpedition;
  const isPlanned = status === 'planned';

  return (
    <Link
      href={`/expedition/${publicId}`}
      className={`block text-white transition-colors ${
        isPlanned
          ? 'bg-[#4676ac] hover:bg-[#365a87]'
          : 'bg-[#ac6d46] hover:bg-[#9a6140]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center text-sm font-mono gap-2">
        <span className="truncate min-w-0">
          {isPlanned ? 'Planned' : 'Active'} Expedition: <span className="font-bold">{title}</span>
        </span>
        <span className="shrink-0 opacity-75">&rarr;</span>
      </div>
    </Link>
  );
}
