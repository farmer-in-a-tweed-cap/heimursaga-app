'use client';

import { UserRole } from '@repo/types';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';

import { apiClient } from '@/lib/api';

import { useSession } from '@/hooks';
import { redirect } from '@/lib';
import { ROUTER } from '@/router';

import { UserGuestAvatar } from './user-avatar';

const getRoleLabel = (role: string) => {
  switch (role) {
    case UserRole.USER:
      return 'member';
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.CREATOR:
      return 'creator';
  }
};

type Props = {
  collapsed?: boolean;
};

export const UserNavbar: React.FC<Props> = ({ collapsed = false }) => {
  const session = useSession();

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

  const { username, picture = '', name = '' } = session || {};
  const roleLabel = getRoleLabel(session?.role || UserRole.USER);

  const links = {
    user: [
      {
        href: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
        label: 'Profile',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
      {
        href: ROUTER.PREMIUM,
        label: 'Upgrade',
      },
    ],
    creator: [
      {
        href: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
        label: 'Profile',
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
    info: [
      {
        href: '#',
        label: 'Privacy policy',
      },
      {
        href: '#',
        label: 'Terms of service',
      },
    ],
  };

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
            <Avatar>
              <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
              <AvatarImage src={picture} alt="avatar" />
            </Avatar>
          ) : (
            <UserGuestAvatar />
          )}
          {!collapsed && (
            <div className="hidden lg:flex flex-col items-start text-sm">
              <span className="font-medium text-sm text-white">{name}</span>
              <span className={cn('font-normal text-xs capitalize')}>
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-background min-w-[240px] ml-4 mb-2 p-0 py-2">
        {(session.logged
          ? session.role === UserRole.CREATOR
            ? links.creator
            : links.user
          : links.guest
        ).map(({ href, label }, key) => (
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
        {links.info.map(({ href, label }, key) => (
          <DropdownMenuItem key={key} asChild>
            <Link
              href={href}
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
