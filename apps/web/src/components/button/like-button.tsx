'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { Heart } from 'lucide-react';

type Props = {
  liked?: boolean;
  likesCount?: number;
  disabled?: boolean;
  onClick?: () => void;
};

export const LikeButton: React.FC<Props> = ({
  liked = false,
  likesCount = 0,
  disabled = false,
  onClick,
}) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        'transition-all hover:bg-accent rounded-full h-[32px]',
        disabled ? '' : 'hover:bg-accent',
      )}
      size="sm"
      disabled={disabled}
      onClick={disabled ? () => {} : onClick}
    >
      <Heart className={cn(liked ? 'fill-black stroke-black' : '')} size={18} />
      <span>{likesCount}</span>
    </Button>
  );
};
