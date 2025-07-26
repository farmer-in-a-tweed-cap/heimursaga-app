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
    toast({ type: 'message', message: 'entry link copied' });
  };

  return (
    <Button
      variant="ghost"
      className="transition-all hover:bg-accent rounded-full h-[32px]"
      size="sm"
      title="Share"
      onClick={handleClick}
    >
      <ShareFatIcon size={24} weight="bold" />
    </Button>
  );
};
