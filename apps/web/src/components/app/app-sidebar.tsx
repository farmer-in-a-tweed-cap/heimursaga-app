'use client';

import { UserRole } from '@repo/types';
import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import {
  BanknoteIcon,
  BellIcon,
  BookmarkIcon,
  CogIcon,
  CoinsIcon,
  CompassIcon,
  HomeIcon,
  LucideProps,
  StarIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

import { CreatePostButton, Logo, UserNavbar } from '@/components';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

type SidebarLink = {
  href: string;
  base: string;
  label: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;
};

const SIDEBAR_LINKS: {
  GUEST: SidebarLink[];
  USER: SidebarLink[];
  CREATOR: SidebarLink[];
} = {
  GUEST: [
    { href: ROUTER.HOME, base: ROUTER.HOME, label: 'Home', icon: HomeIcon },
    {
      href: ROUTER.EXPLORE.HOME,
      base: ROUTER.EXPLORE.HOME,
      label: 'Explore',
      icon: CompassIcon,
    },
  ],
  USER: [
    { href: ROUTER.HOME, base: ROUTER.HOME, label: 'Home', icon: HomeIcon },
    {
      href: ROUTER.EXPLORE.HOME,
      base: ROUTER.EXPLORE.HOME,
      label: 'Explore',
      icon: CompassIcon,
    },
    {
      href: ROUTER.BOOKMARKS.HOME,
      base: ROUTER.BOOKMARKS.HOME,
      label: 'Bookmarks',
      icon: BookmarkIcon,
    },
    {
      href: ROUTER.NOTIFICATIONS,
      base: ROUTER.NOTIFICATIONS,
      label: 'Notifications',
      icon: BellIcon,
    },
    {
      href: ROUTER.PREMIUM,
      base: ROUTER.PREMIUM,
      label: 'Premium',
      icon: StarIcon,
    },
    {
      href: ROUTER.USER.SETTINGS.HOME,
      base: ROUTER.USER.SETTINGS.HOME,
      label: 'Settings',
      icon: CogIcon,
    },
  ],
  CREATOR: [
    { href: ROUTER.HOME, base: ROUTER.HOME, label: 'Home', icon: HomeIcon },
    {
      href: ROUTER.EXPLORE.HOME,
      base: ROUTER.EXPLORE.HOME,
      label: 'Explore',
      icon: CompassIcon,
    },
    {
      href: ROUTER.SPONSORSHIP.ROOT,
      base: ROUTER.SPONSORSHIP.ROOT,
      label: 'Sponsorship',
      icon: CoinsIcon,
    },
    {
      href: ROUTER.PAYOUTS.HOME,
      base: ROUTER.PAYOUTS.HOME,
      label: 'Payouts',
      icon: BanknoteIcon,
    },
    {
      href: ROUTER.BOOKMARKS.HOME,
      base: ROUTER.BOOKMARKS.HOME,
      label: 'Bookmarks',
      icon: BookmarkIcon,
    },
    {
      href: ROUTER.NOTIFICATIONS,
      base: ROUTER.NOTIFICATIONS,
      label: 'Notifications',
      icon: BellIcon,
    },
    {
      href: ROUTER.USER.SETTINGS.HOME,
      base: ROUTER.USER.SETTINGS.ROOT,
      label: 'Settings',
      icon: CogIcon,
    },
  ],
};

export const AppSidebar = () => {
  const pathname = usePathname();
  const session = useSession();

  const userRole = session?.role as UserRole;

  let links: SidebarLink[];

  switch (userRole) {
    case UserRole.CREATOR:
      links = SIDEBAR_LINKS.CREATOR;
      break;
    case UserRole.USER:
      links = SIDEBAR_LINKS.USER;
      break;
    default:
      links = SIDEBAR_LINKS.GUEST;
      break;
  }

  const isActiveLink = (path: string): boolean => {
    path = path.startsWith('/') ? path : `/${path}`;
    const active = path === '/' ? pathname === path : pathname.startsWith(path);
    return active;
  };

  return (
    <div className="hidden sm:max-w-[65px] md:flex lg:max-w-[240px] relative w-full">
      <div className="sm:max-w-[65px] md:flex lg:max-w-[240px] w-full h-screen fixed top-0 bottom-0 left-0 bg-white flex-col">
        <div className="bg-dark text-dark-foreground flex flex-col items-center w-full h-full py-4">
          <div className="w-full box-border lg:px-4 flex flex-row items-center  justify-center lg:justify-start">
            <Link href={ROUTER.HOME}>
              <Logo theme="dark" size="sm" />
            </Link>
          </div>
          <div className="mt-10 w-full h-full flex flex-col justify-between items-center box-border lg:px-3">
            <div className="lg:w-full flex flex-col gap-2">
              {links.map(({ href, base, label, icon: Icon }, key) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    'w-full app-sidebar-link',
                    isActiveLink(base) ? 'app-sidebar-link-active' : '',
                  )}
                >
                  <Icon size={18} className="app-sidebar-link-icon" />
                  <span className="hidden lg:flex text-sm leading-none">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {session ? (
              <div className="w-full flex flex-col gap-8 px-3">
                <CreatePostButton
                  variant="secondary"
                  classNames={{
                    label: 'hidden lg:flex',
                    button: 'min-w-auto bg-white hover:bg-secondary',
                  }}
                >
                  Create
                </CreatePostButton>
                <UserNavbar />
              </div>
            ) : (
              <div className="w-full flex flex-col gap-8">
                <Button variant="secondary" asChild>
                  <a href={ROUTER.LOGIN}>Log in</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
