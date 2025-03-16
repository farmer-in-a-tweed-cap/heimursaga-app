'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { Heart } from 'lucide-react';

type Props = {
  liked?: boolean;
  count?: number;
  disabled?: boolean;
  onClick?: () => void;
};

export const LikeButton: React.FC<Props> = ({
  liked = false,
  count = 0,
  disabled = false,
  onClick,
}) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        'transition-all hover:bg-gray-200 rounded-full h-[32px]',
        disabled ? 'bg-gray-200' : 'hover:bg-gray-200',
      )}
      size="sm"
      disabled={disabled}
      onClick={disabled ? () => {} : onClick}
    >
      <Heart
        className={cn(liked ? 'fill-secondary stroke-secondary' : '')}
        size={18}
      />
      <span>{count}</span>
    </Button>
  );
};
