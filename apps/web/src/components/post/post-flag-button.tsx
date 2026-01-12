'use client';

import { Button } from '@repo/ui/components';
import { FlagIcon } from '@repo/ui/icons';

import { FlagContentModalProps, MODALS } from '../modal';
import { useModal } from '@/hooks';

type Props = {
  postId?: string;
  contentPreview?: string;
};

export const PostFlagButton: React.FC<Props> = ({ postId, contentPreview }) => {
  const modal = useModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!postId) return;

    modal.open<FlagContentModalProps>(MODALS.FLAG_CONTENT, {
      props: {
        contentType: 'post',
        contentId: postId,
        contentPreview: contentPreview,
      },
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="text-gray-500 hover:text-gray-700"
    >
      <FlagIcon size={18} weight="regular" />
      <span className="ml-1 text-sm">Report</span>
    </Button>
  );
};
