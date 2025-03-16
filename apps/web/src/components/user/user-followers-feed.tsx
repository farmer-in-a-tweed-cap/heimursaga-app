'use client';

import { useQuery } from '@tanstack/react-query';

import { getUserFollowersQuery } from '@/lib/api';

import { PostCard, UserCard } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
};

export const UserFollowersFeed: React.FC<Props> = ({ username }) => {
  if (username) {
    const followersQuery = useQuery({
      queryKey: [getUserFollowersQuery.queryKey, username],
      queryFn: () => getUserFollowersQuery.queryFn({ username }),
      enabled: !!username,
      retry: 0,
    });

    const results = followersQuery.data?.results || 0;
    const followers = followersQuery.data?.data || [];

    return followersQuery.isLoading ? (
      <>loading..</>
    ) : followersQuery.isSuccess ? (
      results < 1 ? (
        <>no followers</>
      ) : (
        <div className="w-full flex flex-col gap-1">
          {followers.map(
            ({ firstName, lastName, username, ...follower }, key) => (
              <UserCard
                key={key}
                href={ROUTER.MEMBERS.MEMBER(username)}
                username={username}
                name={[firstName, lastName].join(' ')}
                {...follower}
              />
            ),
          )}
        </div>
      )
    ) : (
      <>no followers</>
    );
  } else {
    return <>no posts</>;
  }
};
