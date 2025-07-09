'use client';

import { UserRole } from '@repo/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { apiClient } from '@/lib/api';

import { useSession } from '@/hooks';
import { redirect } from '@/lib';
import { ROUTER } from '@/router';

import { UserAvatar, UserGuestAvatar } from './user-avatar';

const getRoleLabel = (role: string) => {
  switch (role) {
    case UserRole.USER:
      return 'explorer';
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.CREATOR:
      return 'explorer pro';
  }
};

type Props = {
  collapsed?: boolean;
};

export const UserNavbar: React.FC<Props> = ({ collapsed = false }) => {
  const session = useSession();

  const userRole = session?.role as UserRole;
  const isCreator = session.creator;

  const handleLogout = async () => {
    try {
      // log out
      const response = await apiClient.logout();

      if (!response.success) {
        return;
      }

      redirect(ROUTER.HOME);
    } catch (e) {
      //
    }
  };

  const { username, picture = '' } = session || {};
  const roleLabel = getRoleLabel(session?.role || UserRole.USER);

  const LINKS = {
    user: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Profile',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
      {
        href: ROUTER.UPGRADE,
        label: 'Upgrade',
      },
    ],
    creator: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Profile',
      },
      {
        href: ROUTER.UPGRADE,
        label: 'Upgrade',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
    ],
    guest: [
      {
        href: ROUTER.LOGIN,
        label: 'Log in',
      },
    ],
    admin: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Profile',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
    ],
    info: [
      {
        href: ROUTER.LEGAL.PRIVACY,
        label: 'Privacy policy',
        openNewTab: true,
      },
      {
        href: ROUTER.LEGAL.TERMS,
        label: 'Terms of service',
        openNewTab: true,
      },
    ],
  };

  let links: { href: string; label: string }[] = [];
  let legalLinks: { href: string; label: string; openNewTab: boolean }[] = [];

  switch (userRole) {
    case UserRole.ADMIN:
      links = LINKS.admin;
      legalLinks = [];
      break;
    case UserRole.CREATOR:
      links = LINKS.creator;
      legalLinks = LINKS.info;
      break;
    case UserRole.USER:
      links = LINKS.user;
      legalLinks = LINKS.info;
      break;
    default:
      links = LINKS.guest;
      legalLinks = LINKS.info;
      break;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div
          className={cn(
            'flex flex-row gap-4 items-center justify-center lg:justify-start rounded-none lg:rounded-full box-border bg-dark lg:hover:bg-dark-hover focus:bg-secondary-hover active:bg-dark-hover',
            collapsed ? '' : 'p-2',
          )}
        >
          {session.logged ? (
            <UserAvatar
              src={picture}
              className={cn(isCreator ? 'border-2 border-primary' : '')}
            />
          ) : (
            <UserGuestAvatar />
          )}
          {!collapsed && (
            <div className="hidden lg:flex flex-col items-start text-sm">
              <span className="font-medium text-sm text-white">{username}</span>
              <span className={cn('font-normal text-xs capitalize')}>
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-background min-w-[240px] ml-4 mb-2 p-0 py-2">
        {links.map(({ href, label }, key) => (
          <DropdownMenuItem key={key} asChild>
            <Link
              href={href}
              className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer"
            >
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {legalLinks.map(({ href, label, openNewTab = false }, key) => (
          <DropdownMenuItem key={key} asChild>
            <Link
              href={href}
              target={openNewTab ? '_blank' : '_self'}
              className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer"
            >
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        {session.logged && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer"
              onClick={handleLogout}
            >
              Log out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
