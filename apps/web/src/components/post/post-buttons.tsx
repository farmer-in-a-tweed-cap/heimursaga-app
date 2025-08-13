import { cn } from '@repo/ui/lib/utils';

import { useSession } from '@/hooks';
import { PostBookmarkButton } from './post-bookmark-button';
import { PostLikeButton } from './post-like-button';
import { PostShareButton } from './post-share-button';

type Props = {
  postId?: string;
  liked?: boolean;
  likesCount?: number;
  bookmarked?: boolean;
  bookmarksCount?: number;
  className?: string;
  actions?: {
    like?: boolean;
    bookmark?: boolean;
    share?: boolean;
  };
};

export const PostButtons: React.FC<Props> = ({
  postId,
  actions = { like: true, bookmark: true, share: true },
  liked = false,
  className,
  likesCount = 0,
  bookmarked = false,
  bookmarksCount = 0,
}) => {
  const session = useSession();
  const isLoggedIn = !!session.username;

  return (
    <div
      className={cn(
        'flex flex-row items-center justify-start gap-3',
        className,
      )}
    >
      {actions.like && isLoggedIn && (
        <PostLikeButton postId={postId} liked={liked} likesCount={likesCount} />
      )}
      {actions.bookmark && isLoggedIn && (
        <PostBookmarkButton
          postId={postId}
          bookmarked={bookmarked}
          bookmarksCount={bookmarksCount}
        />
      )}
      {actions.share && <PostShareButton postId={postId} />}
    </div>
  );
};
