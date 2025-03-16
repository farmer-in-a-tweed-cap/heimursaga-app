'use client';

import { BookmarkButton } from '../button';
import { useState } from 'react';

type Props = {
  postId?: string;
  bookmarked?: boolean;
};

export const PostBookmarkButton: React.FC<Props> = ({
  postId,
  bookmarked = false,
}) => {
  const [state, setState] = useState<{ bookmarked: boolean }>({ bookmarked });

  const handleClick = () => {
    if (!postId) return;
    console.log('bookmark', postId);
    setState((state) => ({ ...state, bookmarked: !state.bookmarked }));
  };

  return <BookmarkButton bookmarked={state.bookmarked} onClick={handleClick} />;
};
