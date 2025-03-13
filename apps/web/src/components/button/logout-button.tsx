'use client';

import { Button } from '@repo/ui/components';
import { useMutation } from '@tanstack/react-query';

import { logoutMutation } from '@/lib/api';

export const LogoutButton = () => {
  const mutation = useMutation(logoutMutation);

  const handleClick = () => {
    mutation.mutate();
  };

  return (
    <Button variant="outline" onClick={handleClick}>
      logout
    </Button>
  );
};
