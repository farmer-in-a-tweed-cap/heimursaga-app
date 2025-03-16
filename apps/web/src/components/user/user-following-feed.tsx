'use client';

import { useQuery } from '@tanstack/react-query';

import { getUserFollowingQuery } from '@/lib/api';

import { UserCard } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
};

export const UserFollowingFeed: React.FC<Props> = ({ username }) => {
  if (username) {
    const followingQuery = useQuery({
      queryKey: [getUserFollowingQuery.queryKey, username],
      queryFn: () => getUserFollowingQuery.queryFn({ username }),
      enabled: !!username,
      retry: 0,
    });

    const results = followingQuery.data?.results || 0;
    const following = followingQuery.data?.data || [];

    return followingQuery.isLoading ? (
      <>loading..</>
    ) : followingQuery.isSuccess ? (
      results < 1 ? (
        <>no following</>
      ) : (
        <div className="w-full flex flex-col gap-1">
          {following.map(
            ({ firstName, lastName, username, ...following }, key) => (
              <UserCard
                key={key}
                href={ROUTER.MEMBERS.MEMBER(username)}
                username={username}
                name={[firstName, lastName].join(' ')}
                {...following}
              />
            ),
          )}
        </div>
      )
    ) : (
      <>no following</>
    );
  } else {
    return <>no following</>;
  }
};
