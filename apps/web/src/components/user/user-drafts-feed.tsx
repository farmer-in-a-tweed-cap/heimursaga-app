'use client';

import { useQuery } from '@tanstack/react-query';

import { getUserDrafts } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {};

export const UserDraftsFeed: React.FC<Props> = () => {
  const userDraftsQuery = useQuery({
    queryKey: [getUserDrafts.queryKey],
    queryFn: () => getUserDrafts.queryFn(),
  });

  const results = userDraftsQuery.data?.results || 0;
  const drafts = userDraftsQuery.data?.data || [];

  return userDraftsQuery.isLoading ? (
    <>loading..</>
  ) : userDraftsQuery.isSuccess ? (
    results < 1 ? (
      <>no bookmarks</>
    ) : (
      <div className="w-full flex flex-col gap-2">
        {drafts.map(({ author, ...post }, key) => (
          <PostCard
            key={key}
            {...post}
            liked={false}
            bookmarked={false}
            actions={{ like: false, bookmark: false, edit: true }}
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
    <>no drafts</>
  );
};
