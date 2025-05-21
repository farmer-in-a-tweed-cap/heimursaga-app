'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { getUserFollowersQuery } from '@/lib/api';

import { UserCard } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username: string;
};

export const UserFollowersFeed: React.FC<Props> = ({ username }) => {
  const followersQuery = useQuery({
    queryKey: [getUserFollowersQuery.queryKey, username],
    queryFn: () => getUserFollowersQuery.queryFn({ username }),
    enabled: !!username,
    retry: 0,
  });

  const loading = followersQuery.isLoading;
  const results = followersQuery.data?.results || 0;
  const followers = followersQuery.data?.data || [];

  return loading ? (
    <LoadingSpinner />
  ) : results < 1 ? (
    <>no followers</>
  ) : (
    <div className="w-full flex flex-col gap-2">
      {followers.map(({ name, username, creator, ...follower }, key) => (
        <UserCard
          key={key}
          href={ROUTER.MEMBERS.MEMBER(username)}
          username={username}
          name={name}
          creator={creator}
          {...follower}
        />
      ))}
    </div>
  );
};
