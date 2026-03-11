'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { flagApi } from '@/app/services/api';

const CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'obscene_language', label: 'Obscene language' },
  { value: 'sexually_explicit', label: 'Sexually explicit' },
  { value: 'graphic_violence', label: 'Graphic violence' },
  { value: 'plagiarism', label: 'Plagiarism' },
  { value: 'copyright_violation', label: 'Copyright violation' },
  { value: 'ai_generated_content', label: 'AI-generated content' },
  { value: 'ai_generated_images', label: 'AI-generated images' },
  { value: 'privacy_violation', label: 'Privacy violation' },
  { value: 'unauthorized_marketing', label: 'Unauthorized marketing' },
  { value: 'political_content', label: 'Political content' },
];

type ContentType = 'entry' | 'expedition' | 'explorer' | 'comment';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: ContentType;
  contentId: string;
}

export function ReportModal({ isOpen, onClose, contentType, contentId }: ReportModalProps) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a reason');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: {
        category: string;
        description?: string;
        flaggedPostId?: string;
        flaggedCommentId?: string;
        flaggedExpeditionId?: string;
        flaggedExplorerId?: string;
      } = {
        category,
        description: description.trim() || undefined,
      };

      if (contentType === 'entry') payload.flaggedPostId = contentId;
      else if (contentType === 'comment') payload.flaggedCommentId = contentId;
      else if (contentType === 'expedition') payload.flaggedExpeditionId = contentId;
      else if (contentType === 'explorer') payload.flaggedExplorerId = contentId;

      await flagApi.create(payload);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit report';
      setError(typeof msg === 'string' ? msg : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory('');
    setDescription('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const label = contentType === 'explorer' ? 'profile' : contentType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#994040]" />
            <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">REPORT {label.toUpperCase()}</h3>
          </div>
          <button onClick={handleClose} className="text-[#616161] hover:text-[#202020] dark:hover:text-[#e5e5e5]">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {success ? (
            <div className="text-center py-4">
              <p className="text-sm font-bold text-[#598636] mb-2">Report submitted</p>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Thank you. We will review this {label} and take appropriate action.
              </p>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-[#616161] text-white text-xs font-bold hover:bg-[#4a4a4a] transition-colors"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                Select the reason that best describes the issue.
              </p>

              <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                {CATEGORIES.map(({ value, label: catLabel }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-xs ${
                      category === value
                        ? 'bg-[#4676ac]/10 border border-[#4676ac]'
                        : 'border border-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={value}
                      checked={category === value}
                      onChange={(e) => { setCategory(e.target.value); setError(''); }}
                      className="accent-[#4676ac]"
                    />
                    <span className="text-[#202020] dark:text-[#e5e5e5]">{catLabel}</span>
                  </label>
                ))}
              </div>

              <textarea
                placeholder="Additional details (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={2}
                className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#4676ac] outline-none text-xs resize-none"
              />

              {error && (
                <p className="text-xs text-[#994040] mt-2">{error}</p>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] text-[#616161] dark:text-[#b5bcc4] text-xs font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !category}
                  className="px-4 py-2 bg-[#994040] text-white text-xs font-bold hover:bg-[#7a3333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  SUBMIT REPORT
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
