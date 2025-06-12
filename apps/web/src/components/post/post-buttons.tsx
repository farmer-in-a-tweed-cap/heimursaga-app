import { PostBookmarkButton } from './post-bookmark-button';
import { PostLikeButton } from './post-like-button';
import { PostShareButton } from './post-share-button';

type Props = {
  postId?: string;
  liked?: boolean;
  likesCount?: number;
  bookmarked?: boolean;
  bookmarksCount?: number;
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
  likesCount = 0,
  bookmarked = false,
  bookmarksCount = 0,
}) => {
  return (
    <div className="flex flex-row items-center justify-start gap-1">
      {actions.like && (
        <PostLikeButton postId={postId} liked={liked} likesCount={likesCount} />
      )}
      {actions.bookmark && (
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
