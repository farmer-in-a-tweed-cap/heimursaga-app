'use client';

import { Sheet, SheetContent, SheetTrigger } from '@repo/ui/components';
import { ListIcon } from '@repo/ui/icons';
import Link from 'next/link';
import { useState } from 'react';

import { useScreen } from '@/hooks';
import { ROUTER } from '@/router';

import { Logo } from './logo';

type Props = {};

export const AppTopNavbar: React.FC<Props> = () => {
  return (
    <div className="z-50 relative w-full h-[60px] bg-background flex flex-row items-center justify-between app-container gap-10">
      <Link href={ROUTER.HOME}>
        <Logo size="sm" color="dark" />
      </Link>
      <div>
        <Sheet>
          <SheetTrigger>
            <ListIcon />
          </SheetTrigger>
          <SheetContent side="right" className="min-w-[100vw] h-dvh">
            <div className="flex flex-row justify-between">
              <Logo size="lg" color="dark" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
