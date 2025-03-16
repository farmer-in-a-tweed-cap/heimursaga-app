import { IPostDetail } from '@/types';

import { PostCard } from './post-card';

type Props = {
  posts?: IPostDetail[];
  loading?: boolean;
};

export const PostFeed: React.FC<Props> = ({ posts = [], loading = false }) => {
  return (
    <div className="w-full grid grid-cols-1 gap-3">
      {posts?.map(
        (
          {
            id,
            title,
            content,
            author,
            date,
            lat,
            lon,
            liked,
            likesCount,
            bookmarked,
            bookmarksCount,
          },
          key,
        ) => (
          <PostCard
            key={key}
            id={id}
            title={title}
            content={content}
            date={date}
            author={author}
            coordinates={{ lat, lon }}
            liked={liked}
            likesCount={likesCount}
            bookmarked={bookmarked}
            bookmarksCount={bookmarksCount}
          />
        ),
      )}
    </div>
  );
};
