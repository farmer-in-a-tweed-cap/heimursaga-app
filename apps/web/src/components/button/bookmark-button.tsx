'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { Bookmark } from 'lucide-react';

type Props = {
  bookmarked?: boolean;
  onClick?: () => void;
};

export const BookmarkButton: React.FC<Props> = ({
  bookmarked = false,
  onClick,
}) => {
  return (
    <Button
      variant="ghost"
      className="transition-all hover:bg-gray-200 rounded-full w-[32px] h-[32px]"
      size="sm"
      onClick={onClick}
    >
      <Bookmark
        className={cn(bookmarked ? 'fill-secondary stroke-secondary' : '')}
        size={18}
      />
      {/* <span className="hover:underline underline-offset-4">Bookmark</span> */}
    </Button>
  );
};
