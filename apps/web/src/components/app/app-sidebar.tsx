'use client';

import { cn } from '@repo/ui/lib/utils';
import {
  BellIcon,
  CogIcon,
  CompassIcon,
  HomeIcon,
  LucideProps,
  PenIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

import { CreatePostButton, UserNavbar } from '@/components';
import { ROUTER } from '@/router';

const links: {
  href: string;
  label: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;
}[] = [
  { href: ROUTER.HOME, label: 'Home', icon: HomeIcon },
  { href: ROUTER.EXPLORE.HOME, label: 'Explore', icon: CompassIcon },
  { href: ROUTER.JOURNAL, label: 'Journal', icon: PenIcon },
  { href: ROUTER.NOTIFICATIONS, label: 'Notifications', icon: BellIcon },
  { href: ROUTER.USER.SETTINGS.HOME, label: 'Settings', icon: CogIcon },
];

export const AppSidebar = () => {
  const pathname = usePathname();

  const isActiveLink = (path: string): boolean => {
    path = path.startsWith('/') ? path : `/${path}`;

    const active = path === '/' ? pathname === path : pathname.startsWith(path);

    return active;
  };

  return (
    <div className="hidden sm:max-w-[200px] lg:flex xl:max-w-[240px] relative w-full">
      <div className="hidden sm:max-w-[200px] lg:flex xl:max-w-[240px] w-full h-screen fixed top-0 bottom-0 left-0 bg-white flex-col">
        <div className="bg-dark text-dark-foreground flex flex-col w-full h-full">
          <div className="box-border px-4 py-2 flex flex-row items-center justify-start">
            <Link href={ROUTER.HOME} className="w-full h-auto">
              <div className="w-[45px] h-auto">
                <Image src="/logo-sm-light.svg" width={80} height={80} alt="" />
              </div>
            </Link>
          </div>
          <div className="mt-10 w-full h-full flex flex-col justify-between box-border px-3 py-6">
            <div className="flex flex-col gap-2">
              {links.map(({ href, label, icon: Icon }, key) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    'app-sidebar-link',
                    isActiveLink(href) ? 'app-sidebar-link-active' : '',
                  )}
                >
                  <Icon size={18} className="app-sidebar-link-icon" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="w-full flex flex-col gap-8">
              {/* <CreatePostButton className="w-full" /> */}
              <UserNavbar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
