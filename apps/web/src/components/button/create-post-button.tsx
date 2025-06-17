'use client';

import { Button, ButtonProps } from '@repo/ui/components';
import { PencilSimpleLineIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';

import { redirect } from '@/lib';
import { ROUTER } from '@/router';

type Props = {
  classNames?: {
    button?: string;
    label?: string;
  };
  collapsed?: boolean;
} & ButtonProps;

export const CreatePostButton: React.FC<Props> = ({
  classNames,
  children,
  collapsed = false,
  ...props
}) => {
  const handleClick = () => {
    redirect(ROUTER.ENTRIES.CREATE);
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(collapsed ? 'w-[36px] h-[36px]' : '', classNames?.button)}
      {...props}
    >
      <PencilSimpleLineIcon width={20} weight="bold" />
      {!collapsed && (
        <span
          className={cn(
            collapsed ? 'hidden' : 'hidden lg:flex',
            classNames?.label,
          )}
        >
          {children ? children : 'Create post'}
        </span>
      )}
    </Button>
  );
};
