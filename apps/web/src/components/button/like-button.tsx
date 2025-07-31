'use client';

import { Button } from '@repo/ui/components';
import { HighlighterCircle } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';

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
      title="Like"
      size="sm"
      disabled={disabled}
      onClick={disabled ? () => {} : onClick}
    >
      <HighlighterCircle
        size={24}
        weight={liked ? 'duotone' : 'bold'}
        style={{ color: liked ? '#AC6D46' : '#4676AC' }}
      />
      <span style={{ color: liked ? '#AC6D46' : '#4676AC' }}>{likesCount}</span>
    </Button>
  );
};
