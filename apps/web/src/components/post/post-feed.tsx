import { IPostDetail } from '@/types';

import { PostCard } from './post-card';

type Props = {
  posts?: IPostDetail[];
  loading?: boolean;
};

export const PostFeed: React.FC<Props> = ({ posts = [], loading = false }) => {
  return (
    <div className="w-full grid grid-cols-1 gap-3">
      {posts?.map((post, key) => <PostCard key={key} {...post} />)}
    </div>
  );
};
