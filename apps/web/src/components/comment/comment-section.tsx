'use client';

import { ICommentDetail } from '@repo/types';
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useSession } from '@/hooks';
import { CommentForm } from './comment-form';
import { CommentItem } from './comment-item';
import Link from 'next/link';
import { ROUTER } from '@/router';

type Props = {
  postId: string;
  commentsEnabled?: boolean;
  initialCommentsCount?: number;
  postAuthorUsername?: string;
};

export const CommentSection: React.FC<Props> = ({
  postId,
  commentsEnabled = true,
  initialCommentsCount = 0,
  postAuthorUsername,
}) => {
  const session = useSession();
  const isLoggedIn = session.logged;

  const [comments, setComments] = useState<ICommentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [count, setCount] = useState(initialCommentsCount);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const commentFormRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments with auto-polling every 60 seconds
  const fetchComments = async (reset = false) => {
    try {
      const { success, data } = await apiClient.getComments({
        postId,
        limit: 20,
        cursor: reset ? undefined : cursor,
      });

      if (success && data) {
        if (reset) {
          setComments(data.data);
        } else {
          setComments((prev) => [...prev, ...data.data]);
        }
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
        setCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchComments(true);
  }, [postId]);

  // Auto-polling every 60 seconds
  useEffect(() => {
    if (!commentsEnabled) return;

    const interval = setInterval(() => {
      fetchComments(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [postId, commentsEnabled]);

  const handleCreate = async (content: string) => {
    const { success, data } = await apiClient.createComment({
      postId,
      content,
      parentId: replyingTo || undefined
    });
    if (success && data) {
      setReplyingTo(null); // Clear reply state
      setCount((prev) => prev + 1);
      // Refresh comments from server to get proper nesting structure
      await fetchComments(true);
    }
  };

  const handleUpdate = async (commentId: string, content: string) => {
    const { success, data } = await apiClient.updateComment({ commentId, content });
    if (success && data) {
      setComments((prev) =>
        prev.map((c) => {
          // Update top-level comment
          if (c.id === commentId) return data;
          // Update reply
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) => (r.id === commentId ? data : r)),
            };
          }
          return c;
        }),
      );
    }
  };

  const handleDelete = async (commentId: string) => {
    const { success } = await apiClient.deleteComment({ commentId });
    if (success) {
      let deletedCount = 0;

      setComments((prev) => {
        const newComments = prev
          .filter((c) => {
            if (c.id === commentId) {
              // Deleting a top-level comment
              deletedCount = 1 + (c.replies?.length || 0); // Parent + all replies
              return false;
            }
            return true;
          })
          .map((c) => {
            // Remove from replies if it's a reply being deleted
            if (c.replies) {
              const initialLength = c.replies.length;
              const filteredReplies = c.replies.filter((r) => r.id !== commentId);
              if (filteredReplies.length < initialLength) {
                deletedCount = 1; // Only the reply itself
              }
              return {
                ...c,
                replies: filteredReplies,
                repliesCount: filteredReplies.length,
              };
            }
            return c;
          });

        return newComments;
      });

      setCount((prev) => Math.max(0, prev - deletedCount));
    }
  };

  const handleLoadMore = () => {
    fetchComments(false);
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    // Focus the textarea after state update
    setTimeout(() => {
      commentFormRef.current?.focus();
      commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  // Helper to find parent comment (could be top-level or a reply)
  const findParentComment = (parentId: string): ICommentDetail | undefined => {
    for (const comment of comments) {
      if (comment.id === parentId) return comment;
      if (comment.replies) {
        const reply = comment.replies.find(r => r.id === parentId);
        if (reply) return reply;
      }
    }
    return undefined;
  };

  if (!commentsEnabled) {
    return (
      <div className="w-full py-6">
        <p className="text-sm text-gray-500 text-center">
          Comments are disabled for this post.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Comments {count > 0 && `(${count})`}
        </h3>
      </div>

      {/* Comment Form or Login Prompt */}
      <div className="mb-6">
        {isLoggedIn ? (
          <>
            {replyingTo && (() => {
              const parentComment = findParentComment(replyingTo);
              const contentPreview = parentComment?.content.slice(0, 60) + (parentComment?.content.length && parentComment.content.length > 60 ? '...' : '');
              return (
                <div className="mb-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      Replying to {parentComment?.author.username}
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  {contentPreview && (
                    <p className="text-xs text-gray-600 italic">
                      "{contentPreview}"
                    </p>
                  )}
                </div>
              );
            })()}
            <CommentForm ref={commentFormRef} postId={postId} onSubmit={handleCreate} />
          </>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-3">
              You must be logged in to comment.
            </p>
            <Link
              href={ROUTER.LOGIN}
              className="inline-block px-4 py-2 text-white text-sm font-medium rounded-full hover:opacity-90 transition-all"
              style={{ backgroundColor: '#4676AC' }}
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-1">
        {loading && comments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">
              {isLoggedIn
                ? 'No comments yet. Be the first to comment!'
                : 'No comments yet.'}
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onReply={isLoggedIn ? handleReply : undefined}
                isPostAuthor={postAuthorUsername === comment.author.username}
              />
            ))}

            {hasMore && (
              <div className="pt-4">
                <button
                  onClick={handleLoadMore}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Load more comments
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
