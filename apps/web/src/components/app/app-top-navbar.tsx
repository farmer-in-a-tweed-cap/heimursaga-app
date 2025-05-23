'use client';

import { Searchbar } from '../search';
import { Sheet, SheetContent, SheetTrigger } from '@repo/ui/components';
import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useScreen } from '@/hooks';
import { ROUTER } from '@/router';

import { Logo } from './logo';

type Props = {};

export const AppTopNavbar: React.FC<Props> = () => {
  const { width, height, desktop, mobile } = useScreen();
  const [drawer, setDrawer] = useState<boolean>(false);

  const handleMenuOpen = () => {
    setDrawer(true);
  };

  const handleMenuClose = () => {
    setDrawer(false);
  };

  return (
    <div className="z-50 relative w-full h-[60px] bg-background flex flex-row items-center justify-between app-container">
      <Link href={ROUTER.HOME}>
        <Logo size="sm" color="dark" />
      </Link>

      <div>
        <Searchbar />
      </div>
      <div>
        <Sheet>
          <SheetTrigger>
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="right" className="min-w-[100vw] h-screen">
            <div className="flex flex-row justify-between">
              <Logo size="lg" color="dark" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
