'use client';

import { LikeButton } from '../button';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { postLikeMutation } from '@/lib/api';

type Props = {
  postId?: string;
  liked?: boolean;
  likesCount?: number;
};

export const PostLikeButton: React.FC<Props> = ({
  postId,
  liked = false,
  likesCount = 0,
}) => {
  const [state, setState] = useState<{ liked: boolean; likesCount: number }>({
    liked,
    likesCount,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const mutation = useMutation({
    mutationFn: postLikeMutation.mutationFn,
    onSuccess: ({ likesCount }) => {
      console.log({ likesCount });

      setState(({ likesCount, ...state }) => ({
        ...state,
        likesCount: likesCount,
      }));

      setLoading(false);
    },
    onError: () => {
      // cancel like on error
      setState(({ liked, likesCount, ...state }) => ({
        ...state,
        liked: !liked,
        likesCount: likesCount - 1,
      }));

      setLoading(false);
    },
  });

  const debouncedMutation = useDebouncedCallback(
    ({ postId }: { postId: string }) => {
      mutation.mutate({ postId });
    },
    250,
  );

  const handleClick = () => {
    if (!postId) return;

    setState(({ liked, likesCount, ...state }) => ({
      ...state,
      liked: !liked,
      likesCount: liked ? likesCount - 1 : likesCount + 1,
    }));

    setLoading(true);

    debouncedMutation({ postId });
  };

  return (
    <LikeButton
      liked={state.liked}
      likesCount={state.likesCount}
      disabled={loading}
      onClick={handleClick}
    />
  );
};
