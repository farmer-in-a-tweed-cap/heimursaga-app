import { IPostDetail } from '@repo/types';

import { ROUTER } from '@/router';

import { PostCard } from './post-card';

type Props = {
  posts?: IPostDetail[];
  loading?: boolean;
};

export const PostFeed: React.FC<Props> = ({ posts = [], loading = false }) => {
  return (
    <div className="w-full grid grid-cols-1 gap-2">
      {posts?.map(({ id, ...post }, key) => (
        <PostCard
          href={id ? ROUTER.POSTS.DETAIL(id) : undefined}
          key={key}
          {...post}
          id={id}
          coordinates={{ lat: post.lat, lon: post.lon }}
        />
      ))}
    </div>
  );
};
