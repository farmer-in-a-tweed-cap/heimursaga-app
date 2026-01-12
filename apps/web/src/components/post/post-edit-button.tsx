'use client';

import { Button } from '@repo/ui/components';
import Link from 'next/link';

import { ROUTER } from '@/router';

type Props = {
  postId?: string;
};
export const PostEditButton: React.FC<Props> = ({ postId }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Button variant="outline" asChild>
      <Link
        href={postId ? ROUTER.ENTRIES.EDIT(postId) : '#'}
        onClick={handleClick}
      >
        Edit
      </Link>
    </Button>
  );
};
