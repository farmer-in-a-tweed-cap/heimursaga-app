'use client';

import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { apiClient } from '@/lib/api';

import { FollowButton } from '@/components';
import { DEBOUNCE_TIMEOUT } from '@/constants';

type Props = {
  username?: string;
  followed?: boolean;
};

export const UserFollowButton: React.FC<Props> = ({
  username,
  followed = false,
}) => {
  const [state, setState] = useState<{
    followed: boolean;
  }>({
    followed,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const follow = useDebouncedCallback(
    async ({ username }: { username: string }) => {
      const { success } = await apiClient.followUser({ username });

      if (!success) {
        setState(({ followed, ...state }) => ({
          ...state,
          followed: !followed,
        }));
      }

      setLoading(false);
    },
    DEBOUNCE_TIMEOUT,
  );

  const unfollow = useDebouncedCallback(
    async ({ username }: { username: string }) => {
      const { success } = await apiClient.unfollowUser({ username });

      if (!success) {
        setState(({ followed, ...state }) => ({
          ...state,
          followed: !followed,
        }));
      }

      setLoading(false);
    },
    DEBOUNCE_TIMEOUT,
  );

  const handleClick = async () => {
    if (!username) return;

    if (!state.followed) {
      setState(({ ...state }) => ({
        ...state,
        followed: true,
      }));

      await follow({ username });
    } else {
      setState(({ ...state }) => ({
        ...state,
        followed: false,
      }));

      await unfollow({ username });
    }
  };

  return (
    <FollowButton
      followed={state.followed}
      disabled={loading}
      onClick={handleClick}
    />
  );
};
