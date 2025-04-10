'use client';

import { Button, ButtonProps } from '@repo/ui/components';
import { PenIcon, SquarePenIcon } from 'lucide-react';

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
      <SquarePenIcon width={16} />
      {children ? children : 'Create post'}
    </Button>
  );
};
