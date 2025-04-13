'use client';

import { useQuery } from '@tanstack/react-query';

import { getUserBookmarks } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {};

export const UserBookmarksFeed: React.FC<Props> = () => {
  const userBookmarksQuery = useQuery({
    queryKey: [getUserBookmarks.queryKey],
    queryFn: () => getUserBookmarks.queryFn(),
  });

  const results = userBookmarksQuery.data?.results || 0;
  const bookmarks = userBookmarksQuery.data?.data || [];

  return userBookmarksQuery.isLoading ? (
    <>loading..</>
  ) : userBookmarksQuery.isSuccess ? (
    results < 1 ? (
      <>no bookmarks</>
    ) : (
      <div className="w-full flex flex-col gap-2">
        {bookmarks.map(({ author, ...post }, key) => (
          <PostCard
            key={key}
            {...post}
            author={{
              name: author?.name,
              username: author?.username,
              picture: author?.picture,
            }}
            coordinates={{
              lat: post.lat,
              lon: post.lon,
            }}
          />
        ))}
      </div>
    )
  ) : (
    <>no bookmarks</>
  );
};
