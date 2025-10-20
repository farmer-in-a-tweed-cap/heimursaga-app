'use client';

import { useState, forwardRef } from 'react';
import { Button } from '@repo/ui/components/button';

type Props = {
  postId: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
};

export const CommentForm = forwardRef<HTMLTextAreaElement, Props>(({
  postId,
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'Write a comment...',
  submitLabel = 'Comment',
}, ref) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const maxWords = 100;
  const isNearLimit = wordCount > maxWords * 0.9;
  const isOverLimit = wordCount > maxWords;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          ref={ref}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[80px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        />
        {isNearLimit && (
          <div
            className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}
          >
            {wordCount}/{maxWords} words
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!content.trim() || isSubmitting || isOverLimit}
        >
          {isSubmitting ? 'Posting...' : submitLabel}
        </Button>
      </div>
    </form>
  );
});

CommentForm.displayName = 'CommentForm';
