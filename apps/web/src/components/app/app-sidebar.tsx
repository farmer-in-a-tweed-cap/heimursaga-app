'use client';

import { UserRole } from '@repo/types';
import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import {
  BanknoteIcon,
  BarChart2Icon,
  BellIcon,
  BookmarkIcon,
  ChartBarIcon,
  ChartLineIcon,
  CoinsIcon,
  HandCoinsIcon,
  HomeIcon,
  LibraryIcon,
  LucideProps,
  PenLineIcon,
  PencilIcon,
  PencilLineIcon,
  PlaneTakeoffIcon,
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
        label: 'Home',
        icon: HomeIcon,
      },
    ],
    user: [
      {
        href: ROUTER.HOME,
        base: ROUTER.HOME,
        label: 'Home',
        icon: HomeIcon,
      },
      {
        href: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
        base: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
        label: 'Journal',
        icon: PenLineIcon,
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
    ],
    creator: [
      {
        href: ROUTER.HOME,
        base: ROUTER.HOME,
        label: 'Home',
        icon: HomeIcon,
      },
      {
        href: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
        base: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
        label: 'Journal',
        icon: PenLineIcon,
      },
      {
        href: ROUTER.TRIPS.HOME,
        base: ROUTER.TRIPS.HOME,
        label: 'Trips',
        icon: PlaneTakeoffIcon,
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
        icon: ChartLineIcon,
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
    ],
    admin: [
      {
        href: ROUTER.DASHBOARD.HOME,
        base: ROUTER.DASHBOARD.HOME,
        label: 'Dashboard',
        icon: HomeIcon,
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
        collapsed ? 'lg:max-w-[65px]' : 'lg:max-w-[240px]',
      )}
    >
      <div
        className={cn(
          'md:flex w-full h-screen fixed top-0 bottom-0 left-0 bg-white flex-col',
          collapsed ? 'lg:max-w-[65px]' : 'lg:max-w-[240px]',
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
                  <Icon size={20} className="app-sidebar-link-icon" />
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
