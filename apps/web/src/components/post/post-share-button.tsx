'use client';

import { Button } from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { ShareFatIcon, ShareIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';

import { ROUTER } from '@/router';

type Props = {
  postId?: string;
  onClick?: () => void;
};

export const PostShareButton: React.FC<Props> = ({ postId }) => {
  const toast = useToast();

  const handleClick = () => {
    if (!postId) return;

    const url = new URL(
      ROUTER.ENTRIES.DETAIL(postId),
      process.env.NEXT_PUBLIC_APP_BASE_URL,
    ).toString();
    navigator.clipboard.writeText(url);
    toast({ type: 'message', message: 'Entry link copied' });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="transition-all !rounded-full !w-8 !h-8 !min-w-8 !min-h-8 !p-0 bg-gray-100 hover:bg-gray-200 text-gray-400"
      title="Share"
      onClick={handleClick}
    >
      <ShareFatIcon size={20} weight="bold" />
    </Button>
  );
};
