'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@repo/ui/components';
import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

import { apiClient } from '@/lib/api';
import { redirect } from '@/lib/utils';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

export const UserNavbar = () => {
  const session = useSession();

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout({ cookie: '' }),
    onSuccess: () => {
      redirect(ROUTER.HOME);
    },
  });

  const handleCreatePostClick = () => {
    redirect(ROUTER.POSTS.CREATE);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const { username, picture = '', firstName = '' } = session || {};

  return session ? (
    <div className="flex flex-row items-center gap-10">
      <Button className="hidden lg:flex" onClick={handleCreatePostClick}>
        Create post
      </Button>
      <div className="flex flex-row items-center gap-2">
        <Link href={username ? ROUTER.MEMBERS.MEMBER(username) : '#'}>
          <Avatar>
            <AvatarImage src={picture} />
            <AvatarFallback>{firstName.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Link>
        {/* <Button
          className="hidden lg:flex"
          variant="ghost"
          onClick={handleLogout}
        >
          <LogOut />
        </Button> */}
      </div>
    </div>
  ) : (
    <Link href={ROUTER.LOGIN}>
      <Button>Log in</Button>
    </Link>
  );
};
