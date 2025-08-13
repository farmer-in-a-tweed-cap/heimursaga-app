'use client';

import { Button } from '@repo/ui/components';
import { HighlighterCircle, CheckIcon } from '@repo/ui/icons';
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
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'transition-all !rounded-full !w-8 !h-8 !min-w-8 !min-h-8 !p-0',
          liked 
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-400'
            : 'bg-primary hover:bg-primary/90 !text-white',
          disabled ? 'opacity-50' : '',
        )}
        title={liked ? 'Remove highlight' : 'Highlight'}
        disabled={disabled}
        onClick={disabled ? () => {} : onClick}
      >
        <HighlighterCircle
          size={20}
          weight={liked ? 'fill' : 'regular'}
        />
      </Button>
      {liked && (
        <div className="absolute -top-1 -right-1 bg-gray-400 rounded-full w-3.5 h-3.5 flex items-center justify-center">
          <CheckIcon size={10} weight="bold" className="text-white" />
        </div>
      )}
    </div>
  );
};
