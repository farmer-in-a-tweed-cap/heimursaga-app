'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const router = useRouter();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#202020] border-4 border-[#202020] dark:border-[#616161] max-w-lg w-full p-12 text-center">
        <Compass className="w-16 h-16 text-[#ac6d46] mx-auto mb-4" />
        <div className="text-6xl font-bold font-mono text-[#202020] dark:text-[#e5e5e5] mb-2">
          404
        </div>
        <h2 className="text-lg font-bold font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
          OFF THE MAP
        </h2>
        <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-8">
          This page doesn't exist or has been moved. Check the URL or head back to explore.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            GO BACK
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4676ac] text-white font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] text-sm"
          >
            <Home className="w-4 h-4" />
            HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
