'use client';

import { Button, ButtonProps } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { SquarePenIcon } from 'lucide-react';

import { redirect } from '@/lib';
import { ROUTER } from '@/router';

type Props = {
  classNames?: {
    button?: string;
    label?: string;
  };
} & ButtonProps;

export const CreatePostButton: React.FC<Props> = ({
  classNames,
  children,
  ...props
}) => {
  const handleClick = () => {
    redirect(ROUTER.POSTS.CREATE);
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(classNames?.button, '')}
      {...props}
    >
      <SquarePenIcon width={20} />
      <span className={cn('', classNames?.label)}>
        {children ? children : 'Create post'}
      </span>
    </Button>
  );
};
