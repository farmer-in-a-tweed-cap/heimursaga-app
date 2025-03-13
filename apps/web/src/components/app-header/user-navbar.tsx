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

import { logout } from '@/app/actions';

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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const { username, picture = '', firstName = '' } = session || {};

  return (
    <div className="flex flex-row items-center">
      {session ? (
        <div className="flex flex-row items-center gap-2">
          <Link href={`${ROUTER.MEMBERS}/${username}`}>
            <Avatar>
              <AvatarImage src={picture} />
              <AvatarFallback>{firstName.slice(0, 1)}</AvatarFallback>
            </Avatar>
          </Link>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut />
          </Button>
        </div>
      ) : (
        <Link href={ROUTER.LOGIN}>
          <Button>Log in</Button>
        </Link>
      )}
    </div>
  );
};
