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
  { href: '#', label: 'Journal', icon: PenIcon },
  { href: '#', label: 'Notifications', icon: BellIcon },
  { href: ROUTER.USER.SETTINGS.HOME, label: 'Settings', icon: CogIcon },
];

export const AppSidebar = () => {
  const pathname = usePathname();

  const isActiveLink = (path: string): boolean =>
    pathname === (path.startsWith('/') ? path : `/${path}`);

  return (
    <div className="w-full max-w-[240px]">
      <div className="w-full max-w-[240px] h-screen fixed top-0 bottom-0 left-0 bg-white flex flex-col">
        <div className="bg-dark text-dark-foreground flex flex-col w-full h-full">
          <div className="h-app-header box-border px-4 flex flex-row items-center justify-start">
            <Link href={ROUTER.HOME}>
              <div className="w-[55px] h-auto">
                <Image src="/logo-sm-light.svg" width={80} height={80} alt="" />
              </div>
            </Link>
          </div>
          <div className="mt-10 flex flex-col box-border px-3 py-6 gap-2">
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
        </div>
      </div>
    </div>
  );
};
