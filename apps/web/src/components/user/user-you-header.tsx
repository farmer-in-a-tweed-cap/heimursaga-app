'use client';

import { X } from '@repo/ui/icons';
import { useRouter } from 'next/navigation';

export const UserYouHeader = () => {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">You</h1>
      <button
        onClick={handleClose}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
};