'use client';

import { LikeButton } from '../button';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { apiClient } from '@/lib/api';

import { DEBOUNCE_TIMEOUT } from '@/constants';

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

  const likePost = useDebouncedCallback(
    async ({ postId }: { postId: string }) => {
      const { success, data } = await apiClient.likePost({ postId });
      const likesCount = data?.likesCount || 0;

      if (success) {
        setState(({ ...state }) => ({
          ...state,
          likesCount,
        }));
      } else {
        setState(({ liked, likesCount, ...state }) => ({
          ...state,
          liked: !liked,
          likesCount: likesCount - 1,
        }));
      }

      setLoading(false);
    },
    DEBOUNCE_TIMEOUT,
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!postId) return;

    setState(({ liked, likesCount, ...state }) => ({
      ...state,
      liked: !liked,
      likesCount: liked ? likesCount - 1 : likesCount + 1,
    }));

    setLoading(true);

    likePost({ postId });
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
