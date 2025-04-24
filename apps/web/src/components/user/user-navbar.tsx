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
import { redirect } from '@/lib/utils';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

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

export const UserNavbar = () => {
  const session = useSession();

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout({ cookie: '' }),
    onSuccess: () => {
      redirect(ROUTER.HOME);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const { username, picture = '', name = '' } = session || {};
  const role = getRoleLabel(session?.role || UserRole.USER);

  const links: { href: string; label: string }[] = [
    {
      href: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
      label: 'Profile',
    },
    {
      href: ROUTER.USER.SETTINGS.HOME,
      label: 'Settings',
    },
  ];

  return session ? (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="w-full p-2 flex flex-row gap-4 items-center justify-center lg:justify-start rounded-none lg:rounded-full box-border bg-dark lg:hover:brightness-100 lg:hover:bg-dark-hover focus:bg-dark-hover active:bg-dark-hover">
          <Avatar>
            <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
            <AvatarImage src={picture} alt="avatar" />
          </Avatar>
          <div className="hidden lg:flex flex-col items-start text-sm">
            <span className="font-medium text-sm text-white">{name}</span>
            <span
              className={cn(
                'font-normal text-xs capitalize',
                // role === UserRole.CREATOR ? 'text-yellow-600' : '',
              )}
            >
              {role}
            </span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-background min-w-[240px] ml-4 mb-2 p-0 py-2">
        {links.map(({ href, label }, key) => (
          <DropdownMenuItem key={key} asChild>
            <Link
              href={href}
              className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-gray-200 py-2 hover:cursor-pointer"
            >
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-gray-200 py-2 hover:cursor-pointer"
          onClick={handleLogout}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="flex flex-col">
      <Button variant="secondary" asChild>
        <Link href={ROUTER.LOGIN}>Log in</Link>
      </Button>
    </div>
  );
};
