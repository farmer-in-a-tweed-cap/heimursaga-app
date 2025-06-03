'use client';

import { Button } from '@repo/ui/components';
import { BookmarkSimpleIcon } from '@repo/ui/icons';
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
    <Button
      variant="ghost"
      className={cn(
        'transition-all hover:bg-accent rounded-full',
        disabled ? '' : 'hover:bg-accent',
        disableCount ? 'w-[32px] h-[32px]' : ' w-auto h-[32px]',
      )}
      size="sm"
      disabled={disabled}
      onClick={disabled ? () => {} : onClick}
    >
      <BookmarkSimpleIcon
        size={20}
        weight={bookmarked ? 'fill' : 'bold'}
        className="text-black"
      />
      {!disableCount && <span>{bookmarksCount}</span>}
    </Button>
  );
};
