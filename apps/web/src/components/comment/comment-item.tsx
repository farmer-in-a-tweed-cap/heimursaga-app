'use client';

import { ICommentDetail } from '@repo/types';
import { useState } from 'react';
import { CommentForm } from './comment-form';
import { formatDistanceToNow } from 'date-fns';
import { useModal } from '@/hooks';
import { MODALS } from '@/components/modal/modal-registry';

type Props = {
  comment: ICommentDetail;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply?: (parentId: string) => void;
  isPostAuthor?: boolean;
  isReply?: boolean;
};

export const CommentItem: React.FC<Props> = ({ comment, onUpdate, onDelete, onReply, isPostAuthor = false, isReply = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const modal = useModal();

  const handleUpdate = async (content: string) => {
    await onUpdate(comment.id, content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    modal.open(MODALS.DELETE_CONFIRMATION, {
      props: {
        title: 'Delete Comment',
        message: 'Are you sure you want to delete this comment? This action cannot be undone.',
        itemType: 'comment',
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            await onDelete(comment.id);
          } catch (error) {
            setIsDeleting(false);
          }
        },
      },
    });
  };

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const wasEdited = new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();

  if (isDeleting) {
    return (
      <div className="py-3 px-4 bg-gray-50 rounded-lg opacity-50">
        <p className="text-sm text-gray-500">Deleting...</p>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.author.picture ? (
            <img
              src={comment.author.picture}
              alt={comment.author.username}
              className={`w-8 h-8 rounded-full object-cover border-2 border-solid ${comment.author.creator ? 'border-primary' : 'border-transparent'}`}
            />
          ) : (
            <div className={`w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center border-2 border-solid ${comment.author.creator ? 'border-primary' : 'border-transparent'}`}>
              <span className="text-xs font-medium text-gray-600">
                {comment.author.username[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm text-gray-900">
              {comment.author.username}
            </span>
            {isPostAuthor && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: '#AC6D46' }}>
                Author
              </span>
            )}
            <span className="text-xs text-gray-500">
              {timeAgo}
              {wasEdited && ' (edited)'}
            </span>
          </div>

          {isEditing ? (
            <CommentForm
              postId=""
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              initialValue={comment.content}
              placeholder="Edit your comment..."
              submitLabel="Save"
            />
          ) : (
            <>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {comment.content}
              </p>

              <div className="flex gap-3 mt-2">
                {comment.createdByMe && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
                {!isReply && onReply && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Reply
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Render nested replies */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isPostAuthor={isPostAuthor}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
