'use client';

import { MapSearchbar, Searchbar } from '../search';
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
    <div className="z-50 relative w-full h-[60px] bg-background flex flex-row items-center justify-between app-container gap-10">
      <Link href={ROUTER.HOME}>
        <Logo size="sm" color="dark" />
      </Link>
      {/* <div className="w-full max-w-[320px]">
        <MapSearchbar />
      </div> */}
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
