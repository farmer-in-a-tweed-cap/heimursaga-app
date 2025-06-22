'use client';

import { BookmarkButton } from '../button';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { apiClient } from '@/lib/api';

import { DEBOUNCE_TIMEOUT } from '@/constants';

type Props = {
  postId?: string;
  bookmarked?: boolean;
  bookmarksCount?: number;
  disableCount?: boolean;
};

export const PostBookmarkButton: React.FC<Props> = ({
  postId,
  bookmarked = false,
  bookmarksCount = 0,
  disableCount = false,
}) => {
  const [state, setState] = useState<{
    bookmarked: boolean;
    bookmarksCount: number;
  }>({
    bookmarked,
    bookmarksCount,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const bookmarkPost = useDebouncedCallback(
    async ({ postId }: { postId: string }) => {
      const { success, data } = await apiClient.bookmarkPost({ postId });
      const bookmarksCount = data?.bookmarksCount || 0;

      if (success) {
        setState(({ ...state }) => ({
          ...state,
          bookmarksCount,
        }));
      } else {
        setState(({ bookmarked, bookmarksCount, ...state }) => ({
          ...state,
          bookmarked: !bookmarked,
          bookmarksCount: bookmarksCount - 1,
        }));
      }

      setLoading(false);
    },
    DEBOUNCE_TIMEOUT,
  );

  const handleClick = () => {
    if (!postId) return;

    setState(({ bookmarked, bookmarksCount, ...state }) => ({
      ...state,
      bookmarked: !bookmarked,
      bookmarksCount: bookmarked ? bookmarksCount - 1 : bookmarksCount + 1,
    }));

    setLoading(true);

    bookmarkPost({ postId });
  };

  return (
    <BookmarkButton
      bookmarked={state.bookmarked}
      bookmarksCount={state.bookmarksCount}
      disabled={loading}
      disableCount={disableCount}
      onClick={handleClick}
    />
  );
};
