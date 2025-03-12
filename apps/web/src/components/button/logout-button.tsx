'use client';

import { Button } from '@repo/ui/components';
import { useMutation } from '@tanstack/react-query';

import { logoutMutation } from '@/lib/actions';

export const LogoutButton = () => {
  const mutation = useMutation(logoutMutation);

  const handleClick = () => {
    mutation.mutate({});
    alert('logout');
  };

  return (
    <Button variant="outline" onClick={handleClick}>
      logout
    </Button>
  );
};
