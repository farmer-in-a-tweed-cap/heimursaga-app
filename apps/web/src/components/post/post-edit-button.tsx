'use client';

import { Button } from '@repo/ui/components';
import { useRouter } from 'next/navigation';

import { ROUTER } from '@/router';

type Props = {
  postId?: string;
};
export const PostEditButton: React.FC<Props> = ({ postId }) => {
  const router = useRouter();

  const handleEdit = () => {
    if (!postId) return;
    router.push(ROUTER.POSTS.EDIT(postId));
  };

  return (
    <Button variant="outline" onClick={handleEdit}>
      Edit
    </Button>
  );
};
