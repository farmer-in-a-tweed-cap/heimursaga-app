'use client';

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components';
import { UserPlus, UserCheck } from '@repo/ui/icons';
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
    <Tooltip>
      <TooltipTrigger>
        <Button
          disabled={disabled}
          size="sm"
          className={cn(
            '!rounded-full !w-10 !h-10 !min-w-10 !min-h-10 !p-0',
            followed
              ? 'bg-accent hover:bg-accent text-gray-800'
              : 'bg-primary hover:bg-primary/90 text-white',
          )}
          onClick={disabled ? () => {} : onClick}
        >
          {followed ? (
            <UserCheck size={20} weight="regular" />
          ) : (
            <UserPlus size={20} weight="regular" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {followed ? 'Unfollow' : 'Follow'}
      </TooltipContent>
    </Tooltip>
  );
};
