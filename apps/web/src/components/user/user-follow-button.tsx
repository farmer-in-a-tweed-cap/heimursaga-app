'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import {
  followUserMutation,
  postBookmarkMutation,
  unfollowUserMutation,
} from '@/lib/api';

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

  const mutations = {
    follow: useMutation({
      mutationFn: followUserMutation.mutationFn,
      onSuccess: () => {
        setLoading(false);
      },
      onError: () => {
        // cancel follow on error
        setState(({ followed, ...state }) => ({
          ...state,
          followed: !followed,
        }));

        setLoading(false);
      },
    }),
    unfollow: useMutation({
      mutationFn: unfollowUserMutation.mutationFn,
      onSuccess: () => {
        setLoading(false);
      },
      onError: () => {
        // cancel unfollow on error
        setState(({ followed, ...state }) => ({
          ...state,
          followed: !followed,
        }));

        setLoading(false);
      },
    }),
  };

  const debouncedMutation = useDebouncedCallback(
    ({ username }: { username: string }) => {
      if (!state.followed) {
        console.log('follow', username);
        // follow if not followed

        setState(({ ...state }) => ({
          ...state,
          followed: true,
        }));

        mutations.follow.mutate({ username });
      } else {
        console.log('unfollow', username);

        // unfollow if followed
        setState(({ ...state }) => ({
          ...state,
          followed: false,
        }));

        mutations.unfollow.mutate({ username });
      }
    },
    DEBOUNCE_TIMEOUT,
  );

  const handleClick = () => {
    if (!username) return;

    setLoading(true);

    debouncedMutation({ username });
  };

  return (
    <FollowButton
      followed={state.followed}
      disabled={loading}
      onClick={handleClick}
    />
  );
};
