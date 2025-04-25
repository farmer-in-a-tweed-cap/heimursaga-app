import { PostCard } from '../post';
import { IPostDetail } from '@repo/types';
import { LoadingSpinner } from '@repo/ui/components';

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
    <div className="relative flex flex-col w-full h-full bg-white">
      <div className="flex flex-col gap-1 bg-white py-4 px-6">
        <span className="text-lg font-medium">Explore</span>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <span className="h-[16px] text-sm font-normal text-gray-800">
            {results} entries found
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4 overflow-y-scroll no-scrollbar p-6 box-border">
        {posts.map(({ id, ...post }, key) => (
          <PostCard
            key={key}
            {...post}
            id={id}
            actions={{ bookmark: true }}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
};
