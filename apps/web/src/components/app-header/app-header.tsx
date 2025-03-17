import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

import { APP_HEADER_HEIGHT } from '@/constants';
import { ROUTER } from '@/router';

import { UserNavbar } from './user-navbar';

const data = {
  menu: [
    { href: ROUTER.EXPLORE.HOME, label: 'Explore' },
    // { href: ROUTER.HOME, label: 'Upgrade' },
  ],
};

export const AppHeader = () => {
  return (
    <div
      className={cn(
        'w-full bg-white flex flex-row justify-center items-center drop-shadow-sm overflow-x-hidden',
        `h-[${APP_HEADER_HEIGHT}px]`,
      )}
    >
      <div className="app-container max-w-screen-xl box-border flex flex-row items-center justify-between">
        <Link href={ROUTER.HOME}>
          <div className="w-[100px] lg:w-[120px] border-2 border-red-300">
            <Image src="/logo.svg" width={140} height={100} alt="" />
          </div>
        </Link>
        <div className="flex flex-row items-center gap-10">
          <nav className="hidden lg:flex">
            <div className="flex flex-row items-center justify-start gap-6">
              {data.menu.map(({ href, label }, key) => (
                <Link
                  key={key}
                  href={href}
                  className="capitalize text-sm font-medium"
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
          <UserNavbar />
        </div>
      </div>
    </div>
  );
};
