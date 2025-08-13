'use client';

import { Button } from '@repo/ui/components';
import { BookmarkSimpleIcon, CheckIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';

type Props = {
  bookmarked?: boolean;
  bookmarksCount?: number;
  disabled?: boolean;
  disableCount?: boolean;
  onClick?: () => void;
};

export const BookmarkButton: React.FC<Props> = ({
  bookmarked = false,
  bookmarksCount = 0,
  disabled = false,
  disableCount = false,
  onClick,
}) => {
  return (
    <div className="relative">
      <Button
        variant="ghost"
        title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        size="sm"
        className={cn(
          'transition-all !rounded-full !w-8 !h-8 !min-w-8 !min-h-8 !p-0',
          bookmarked 
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-400'
            : 'bg-primary hover:bg-primary/90 !text-white',
          disabled ? 'opacity-50' : '',
        )}
        disabled={disabled}
        onClick={disabled ? () => {} : onClick}
      >
        <BookmarkSimpleIcon
          size={18}
          weight={bookmarked ? 'fill' : 'regular'}
        />
      </Button>
      {bookmarked && (
        <div className="absolute -top-1 -right-1 bg-gray-400 rounded-full w-3.5 h-3.5 flex items-center justify-center">
          <CheckIcon size={10} weight="bold" className="text-white" />
        </div>
      )}
    </div>
  );
};
