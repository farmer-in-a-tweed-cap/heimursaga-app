import { PostCard } from '../post';
import { Card, Skeleton } from '@repo/ui/components';

import { ROUTER } from '@/router';
import { IPostDetail } from '@/types';

export const ExploreSidebar = ({
  loading = false,
  results = 0,
  posts = [],
}: {
  loading?: boolean;
  results?: number;
  posts?: IPostDetail[];
}) => {
  return (
    <Card className="w-full h-full box-border p-6 flex flex-col">
      <div className="flex flex-col gap-3">
        <span className="text-xl font-medium">Explore</span>

        {loading ? (
          <Skeleton className="w-[100px] h-[16px] rounded-full" />
        ) : (
          <span className="h-[16px] text-sm font-normal text-gray-800">
            {results} entries found
          </span>
        )}
      </div>
      <div className="mt-8 flex flex-col gap-4 overflow-y-scroll no-scrollbar">
        {posts.map(({ id, ...post }, key) => (
          <PostCard
            key={key}
            href={ROUTER.POSTS.DETAIL(id)}
            {...post}
            id={id}
            actions={{ bookmark: true }}
          />
        ))}
      </div>
    </Card>
  );
};
