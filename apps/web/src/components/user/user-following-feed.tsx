'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { getUserFollowingQuery } from '@/lib/api';

import { UserCard } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username: string;
};

export const UserFollowingFeed: React.FC<Props> = ({ username }) => {
  const followingQuery = useQuery({
    queryKey: [getUserFollowingQuery.queryKey, username],
    queryFn: () => getUserFollowingQuery.queryFn({ username }),
    enabled: !!username,
    retry: 0,
  });

  const loading = followingQuery.isLoading;
  const results = followingQuery.data?.results || 0;
  const following = followingQuery.data?.data || [];

  return loading ? (
    <LoadingSpinner />
  ) : results < 1 ? (
    <>no following</>
  ) : (
    <div className="w-full flex flex-col gap-2">
      {following.map(({ name, username, creator, ...following }, key) => (
        <UserCard
          key={key}
          href={ROUTER.MEMBERS.MEMBER(username)}
          username={username}
          name={name}
          creator={creator}
          {...following}
        />
      ))}
    </div>
  );
};
