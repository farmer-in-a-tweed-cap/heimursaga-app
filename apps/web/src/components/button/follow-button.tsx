'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';

type Props = {
  followed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export const FollowButton: React.FC<Props> = ({
  followed = false,
  disabled = false,
  onClick,
}) => {
  return (
    <Button
      disabled={disabled}
      className={cn(
        followed
          ? 'transition-all bg-accent hover:bg-accent text-gray-800'
          : '',
      )}
      onClick={disabled ? () => {} : onClick}
    >
      {followed ? 'Following' : 'Follow'}
    </Button>
  );
};
