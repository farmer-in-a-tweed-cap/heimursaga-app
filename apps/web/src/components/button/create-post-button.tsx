'use client';

import { Button, ButtonProps } from '@repo/ui/components';

import { redirect } from '@/lib/utils';

import { ROUTER } from '@/router';

export const CreatePostButton: React.FC<ButtonProps> = ({
  children,
  ...props
}) => {
  const handleClick = () => {
    redirect(ROUTER.POSTS.CREATE);
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children ? children : 'Create post'}
    </Button>
  );
};
