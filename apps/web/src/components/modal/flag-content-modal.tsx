'use client';

import { useState } from 'react';
import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { FlagCategory } from '@repo/types';
import { FlagIcon } from '@repo/ui/icons';

import { apiClient } from '@/lib/api';

import { ModalBaseProps } from './modal-provider';

// Constants
const MAX_DESCRIPTION_LENGTH = 1000;

export type FlagContentModalProps = {
  contentType: 'post' | 'comment';
  contentId: string;
  contentPreview?: string;
};

const CONTENT_TYPE_LABELS = {
  post: 'Entry',
  comment: 'Comment',
};

const CATEGORY_LABELS: Record<FlagCategory, string> = {
  [FlagCategory.AI_GENERATED_CONTENT]: 'AI-generated content',
  [FlagCategory.OBSCENE_LANGUAGE]: 'Obscene language',
  [FlagCategory.SEXUALLY_EXPLICIT]: 'Sexually explicit content',
  [FlagCategory.GRAPHIC_VIOLENCE]: 'Graphic violence',
  [FlagCategory.POLITICAL_CONTENT]: 'Political/partisan content',
  [FlagCategory.UNAUTHORIZED_MARKETING]: 'Unauthorized marketing',
  [FlagCategory.PLAGIARISM]: 'Plagiarism',
  [FlagCategory.SPAM]: 'Spam',
  [FlagCategory.COPYRIGHT_VIOLATION]: 'Copyright violation',
  [FlagCategory.HARASSMENT]: 'Harassment or bullying',
  [FlagCategory.AI_GENERATED_IMAGES]: 'AI-generated images',
  [FlagCategory.SEXUALLY_GRAPHIC_MEDIA]: 'Sexually graphic media',
  [FlagCategory.VIOLENCE_GORE_IMAGERY]: 'Violence or gore imagery',
  [FlagCategory.COMMERCIAL_BRANDING]: 'Commercial branding',
  [FlagCategory.PRIVACY_VIOLATION]: 'Privacy violation',
};

const FlagContentModal: React.FC<ModalBaseProps<FlagContentModalProps>> = ({
  props,
  close,
}) => {
  const { contentType = 'post', contentId, contentPreview } = props || {};
  const [category, setCategory] = useState<FlagCategory | ''>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!category) {
      toast({
        type: 'error',
        message: 'Please select a reason to report this content.',
      });
      return;
    }

    try {
      setLoading(true);
      await apiClient.createFlag({
        query: {},
        payload: {
          category: category as FlagCategory,
          description: description || undefined,
          flaggedPostId: contentType === 'post' ? contentId : undefined,
          flaggedCommentId: contentType === 'comment' ? contentId : undefined,
        },
      });

      toast({
        type: 'message',
        message: 'Report submitted. Thank you for helping keep our community safe.',
      });
      close();
    } catch (error: any) {
      let errorMessage = 'Failed to submit report. Please try again.';

      // Map specific errors to user-friendly messages
      if (error?.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already reported') || msg.includes('duplicate')) {
          errorMessage = 'You have already reported this content.';
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          errorMessage = 'You have submitted too many reports recently. Please try again later.';
        } else if (msg.includes('not found')) {
          errorMessage = 'This content could not be found. It may have been deleted.';
        } else if (msg.includes('unauthorized') || msg.includes('authentication')) {
          errorMessage = 'Please sign in to report content.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FlagIcon size={20} weight="bold" />
          Report {CONTENT_TYPE_LABELS[contentType]}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {contentPreview && (
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-600 italic line-clamp-3">
              {contentPreview}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="category">
            Reason for reporting <span className="text-red-500">*</span>
          </Label>
          <Select value={category} onValueChange={(v) => setCategory(v as FlagCategory)}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Additional details (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide any additional context about this report..."
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">{description.length}/{MAX_DESCRIPTION_LENGTH}</p>
        </div>

        <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p>
            Reports are reviewed by our moderation team. False reports may result in
            account restrictions.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading || !category} loading={loading}>
          Submit Report
        </Button>
      </DialogFooter>
    </>
  );
};

export default FlagContentModal;
