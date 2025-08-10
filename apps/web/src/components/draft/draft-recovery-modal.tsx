'use client';

import {
  Button,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { ClockIcon, MapPinIcon, TrashIcon } from '@repo/ui/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { dateformat } from '@/lib';
import { ModalBaseProps } from '@/components/modal/modal-provider';

interface Draft {
  id: string;
  title: string;
  content: string;
  place: string;
  date: string;
  public: boolean;
  sponsored: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DraftRecoveryModalProps = {
  onDraftSelected: (draftId: string) => void;
  drafts?: Draft[];
};

const DraftRecoveryModal: React.FC<ModalBaseProps<DraftRecoveryModalProps>> = ({
  props,
  close,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deletingDrafts, setDeletingDrafts] = useState<Set<string>>(new Set());

  const { onDraftSelected, drafts: propsDrafts } = props || {};

  // Use drafts from props if provided, otherwise fetch
  const { data: draftsResponse, isLoading } = useQuery({
    queryKey: [API_QUERY_KEYS.USER_DRAFTS],
    queryFn: () => apiClient.getDrafts(),
    enabled: !propsDrafts, // Only fetch when no props provided
  });

  const deleteMutation = useMutation({
    mutationFn: (draftId: string) => apiClient.deletePost({ query: { postId: draftId } }),
    onSuccess: (_, draftId) => {
      setDeletingDrafts(prev => {
        const newSet = new Set(prev);
        newSet.delete(draftId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER_DRAFTS] });
      toast({ type: 'success', message: 'Draft deleted successfully' });
    },
    onError: (_, draftId) => {
      setDeletingDrafts(prev => {
        const newSet = new Set(prev);
        newSet.delete(draftId);
        return newSet;
      });
      toast({ type: 'error', message: 'Failed to delete draft' });
    },
  });

  const handleDraftSelect = (draftId: string) => {
    if (onDraftSelected) {
      onDraftSelected(draftId);
    }
    close();
  };

  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering draft selection
    setDeletingDrafts(prev => new Set(prev).add(draftId));
    deleteMutation.mutate(draftId);
  };

  // Handle the API response structure properly
  const apiDrafts = draftsResponse?.data?.data || draftsResponse?.data || [];
  const drafts = propsDrafts || apiDrafts || [];
  
  // Ensure drafts is always an array for type safety
  const draftsArray = Array.isArray(drafts) ? drafts : [];
  

  return (
    <>
      <DialogHeader>
        <DialogTitle>Continue a Draft</DialogTitle>
        <p className="text-sm text-muted-foreground">
          You have {draftsArray.length} unsaved draft{draftsArray.length !== 1 ? 's' : ''}. 
          Select one to continue editing or start a new entry.
        </p>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : draftsArray.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No drafts found
            </div>
          ) : (
            <div className="space-y-3">
              {draftsArray.map((draft) => {
                const isDeleting = deletingDrafts.has(draft.id);
                
                return (
                  <div
                    key={draft.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      isDeleting ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    onClick={() => !isDeleting && handleDraftSelect(draft.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {draft.title || 'Untitled Draft'}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {draft.public ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Public
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Private
                              </span>
                            )}
                            {draft.sponsored && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Sponsored
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {draft.content && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {draft.content}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {draft.place && (
                            <div className="flex items-center gap-1">
                              <MapPinIcon size={12} />
                              <span>{draft.place}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <ClockIcon size={12} />
                            <span>
                              Last saved {dateformat((draft as any).updatedAt).format('MMM DD, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon size={16} />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={close}>
          Start New Entry
        </Button>
      </div>
    </>
  );
};

export default DraftRecoveryModal;