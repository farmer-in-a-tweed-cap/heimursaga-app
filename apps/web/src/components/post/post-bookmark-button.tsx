'use client';

import { BookmarkButton } from '../button';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { postBookmarkMutation } from '@/lib/api';

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

  const mutation = useMutation({
    mutationFn: postBookmarkMutation.mutationFn,
    onSuccess: ({ bookmarksCount }) => {
      console.log({ bookmarksCount });

      setState(({ bookmarksCount, ...state }) => ({
        ...state,
        bookmarksCount: bookmarksCount,
      }));

      setLoading(false);
    },
    onError: () => {
      // cancel like on error
      setState(({ bookmarked, bookmarksCount, ...state }) => ({
        ...state,
        bookmarked: !bookmarked,
        bookmarksCount: bookmarksCount - 1,
      }));

      setLoading(false);
    },
  });

  const debouncedMutation = useDebouncedCallback(
    ({ postId }: { postId: string }) => {
      console.log('bookmark');

      mutation.mutate({ postId });
    },
    250,
  );

  const handleClick = () => {
    if (!postId) return;

    setState(({ bookmarked, bookmarksCount, ...state }) => ({
      ...state,
      bookmarked: !bookmarked,
      bookmarksCount: bookmarked ? bookmarksCount - 1 : bookmarksCount + 1,
    }));

    setLoading(true);

    debouncedMutation({ postId });
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
