'use client';

import Link from 'next/link';

import { ROUTER } from '@/router';

import { Logo } from './logo';

type Props = {};

export const AppTopNavbar: React.FC<Props> = () => {
  return (
    <div className="lg:hidden fixed top-4 left-4 z-50">
      <Link href={ROUTER.EXPLORE.RESET}>
        <div className="w-12 h-12 bg-dark rounded-full flex items-center justify-center shadow-lg">
          <Logo size="sm" color="light" />
        </div>
      </Link>
    </div>
  );
};
