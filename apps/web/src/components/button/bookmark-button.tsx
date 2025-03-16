'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { Bookmark } from 'lucide-react';

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
    <Button
      variant="ghost"
      className={cn(
        'transition-all hover:bg-gray-200 rounded-full',
        disabled ? '' : 'hover:bg-gray-200',
        disableCount ? 'w-[32px] h-[32px]' : ' w-auto h-[32px]',
      )}
      size="sm"
      disabled={disabled}
      onClick={disabled ? () => {} : onClick}
    >
      <Bookmark
        className={cn(bookmarked ? 'fill-secondary stroke-secondary' : '')}
        size={18}
      />
      {!disableCount && <span>{bookmarksCount}</span>}
    </Button>
  );
};
