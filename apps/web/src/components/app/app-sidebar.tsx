'use client';

import { UserRole } from '@repo/types';
import { Button } from '@repo/ui/components';
import {
  BellIcon,
  BookmarkSimpleIcon,
  ChartPieSliceIcon,
  HandCoinsIcon,
  HouseIcon,
  IconProps,
  MagnifyingGlassIcon,
  PathIcon,
  PencilIcon,
  WalletIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
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
    Omit<IconProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;
};

type Props = {
  collapsed?: boolean;
};

export const AppSidebar: React.FC<Props> = ({ collapsed = false }) => {
  const pathname = usePathname();
  const session = useSession();

  const username = session?.username;
  const userRole = session?.role as UserRole;

  const showCreateButton =
    session.logged &&
    (userRole === UserRole.USER || userRole === UserRole.CREATOR);

  const LINKS: {
    guest: SidebarLink[];
    user: SidebarLink[];
    creator: SidebarLink[];
    admin: SidebarLink[];
  } = {
    guest: [
      {
        href: ROUTER.HOME,
        base: ROUTER.HOME,
        label: 'Explore',
        icon: MagnifyingGlassIcon,
      },
    ],
    user: [
      {
        href: ROUTER.HOME,
        base: ROUTER.HOME,
        label: 'Explore',
        icon: MagnifyingGlassIcon,
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        base: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
        icon: PencilIcon,
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        base: ROUTER.BOOKMARKS.HOME,
        label: 'Bookmarks',
        icon: BookmarkSimpleIcon,
      },
      {
        href: ROUTER.NOTIFICATIONS,
        base: ROUTER.NOTIFICATIONS,
        label: 'Notifications',
        icon: BellIcon,
      },
    ],
    creator: [
      {
        href: ROUTER.HOME,
        base: ROUTER.HOME,
        label: 'Explore',
        icon: MagnifyingGlassIcon,
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        base: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
        icon: PencilIcon,
      },
      {
        href: ROUTER.JOURNEYS.HOME,
        base: ROUTER.JOURNEYS.HOME,
        label: 'Journeys',
        icon: PathIcon,
      },
      {
        href: ROUTER.SPONSORSHIP.ROOT,
        base: ROUTER.SPONSORSHIP.ROOT,
        label: 'Sponsorship',
        icon: HandCoinsIcon,
      },
      {
        href: ROUTER.INSIGHTS.HOME,
        base: ROUTER.INSIGHTS.HOME,
        label: 'Insights',
        icon: ChartPieSliceIcon,
      },
      {
        href: ROUTER.PAYOUTS.HOME,
        base: ROUTER.PAYOUTS.HOME,
        label: 'Payouts',
        icon: WalletIcon,
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        base: ROUTER.BOOKMARKS.HOME,
        label: 'Bookmarks',
        icon: BookmarkSimpleIcon,
      },
      {
        href: ROUTER.NOTIFICATIONS,
        base: ROUTER.NOTIFICATIONS,
        label: 'Notifications',
        icon: BellIcon,
      },
    ],
    admin: [
      {
        href: ROUTER.ADMIN.HOME,
        base: ROUTER.ADMIN.HOME,
        label: 'Admin',
        icon: HouseIcon,
      },
    ],
  };

  let links: SidebarLink[] = [];

  switch (userRole) {
    case UserRole.ADMIN:
      links = LINKS.admin;
      break;
    case UserRole.CREATOR:
      links = LINKS.creator;
      break;
    case UserRole.USER:
      links = LINKS.user;
      break;
    default:
      links = LINKS.guest;
      break;
  }

  const isActiveLink = (path: string): boolean => {
    path = path.startsWith('/') ? path : `/${path}`;
    const active = path === '/' ? pathname === path : pathname.startsWith(path);
    return active;
  };

  return (
    <div
      className={cn(
        'hidden lg:flex relative w-full',
        collapsed ? 'desktop:max-w-[65px]' : 'desktop:max-w-[240px]',
      )}
    >
      <div
        className={cn(
          'md:flex w-full h-dvh fixed top-0 bottom-0 left-0 bg-white flex-col',
          collapsed ? 'desktop:max-w-[65px]' : 'desktop:max-w-[240px]',
        )}
      >
        <div className="bg-dark text-dark-foreground flex flex-col items-center w-full h-full py-4">
          <div
            className={cn(
              'w-full box-border flex flex-row items-center justify-center',
              collapsed ? '' : 'lg:px-4 lg:justify-start',
            )}
          >
            <Link href={ROUTER.HOME}>
              <Logo color="light" size="sm" />
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
                  <Icon
                    size={20}
                    weight="bold"
                    className="app-sidebar-link-icon"
                  />
                  <span
                    className={cn(
                      'text-sm leading-none',
                      collapsed ? 'hidden' : 'hidden lg:flex',
                    )}
                  >
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          {session.logged ? (
            <div
              className={cn(
                'w-full flex flex-col gap-6',
                collapsed ? 'items-center justify-center' : 'px-3',
              )}
            >
              {showCreateButton && (
                <CreatePostButton
                  variant="secondary"
                  collapsed={collapsed}
                  classNames={{
                    button: 'min-w-auto bg-white hover:bg-accent',
                  }}
                >
                  Create
                </CreatePostButton>
              )}
              <UserNavbar collapsed={collapsed} />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-8 px-3">
              {collapsed ? (
                <UserNavbar collapsed={collapsed} />
              ) : (
                <Button variant="secondary" className="w-full" asChild>
                  <a href={ROUTER.LOGIN}>Log in</a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
