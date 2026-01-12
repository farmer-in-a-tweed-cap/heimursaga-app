'use client';

import { useState, useEffect } from 'react';
import {
  Badge,
  Button,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { FlagStatus, FlagActionType, IFlagDetail } from '@repo/types';
import Link from 'next/link';

import { apiClient } from '@/lib/api';
import { dateformat } from '@/lib';
import { ModalComponent } from './modal-registry';

// Constants
const MAX_ADMIN_NOTES_LENGTH = 1000;

export interface AdminFlagDetailsModalProps {
  flagId: string;
  onFlagUpdated?: () => void;
}

const STATUS_LABELS: Record<FlagStatus, string> = {
  [FlagStatus.PENDING]: 'Pending',
  [FlagStatus.REVIEWED]: 'Reviewed',
  [FlagStatus.DISMISSED]: 'Dismissed',
  [FlagStatus.ACTION_TAKEN]: 'Action Taken',
};

const STATUS_COLORS: Record<FlagStatus, 'default' | 'success' | 'secondary' | 'destructive' | 'outline'> = {
  [FlagStatus.PENDING]: 'destructive',
  [FlagStatus.REVIEWED]: 'default',
  [FlagStatus.DISMISSED]: 'secondary',
  [FlagStatus.ACTION_TAKEN]: 'success',
};

const AdminFlagDetailsModal: ModalComponent<AdminFlagDetailsModalProps> = ({
  props,
  close,
}) => {
  const [flag, setFlag] = useState<IFlagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchFlag = async (flagId: string) => {
      try {
        if (isMounted) setLoading(true);
        const response = await apiClient.getFlagById({ query: { flagId } });
        if (isMounted) {
          setFlag(response.data || null);
          setAdminNotes(response.data?.adminNotes || '');
        }
      } catch (error) {
        console.error('Failed to fetch flag:', error);
        if (isMounted) setFlag(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (props?.flagId) {
      fetchFlag(props.flagId);
    }

    return () => {
      isMounted = false;
    };
  }, [props?.flagId]);

  const handleDismiss = async () => {
    if (!flag) return;

    try {
      setActionLoading(true);
      await apiClient.updateFlag({
        query: { flagId: flag.id },
        payload: {
          status: FlagStatus.DISMISSED,
          adminNotes: adminNotes || undefined,
        },
      });

      toast({
        type: 'success',
        message: 'Flag dismissed successfully',
      });

      props?.onFlagUpdated?.();
      close();
    } catch (error: any) {
      toast({
        type: 'error',
        message: error?.message || 'Failed to dismiss flag',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContent = async () => {
    if (!flag) return;

    try {
      setActionLoading(true);
      await apiClient.updateFlag({
        query: { flagId: flag.id },
        payload: {
          status: FlagStatus.ACTION_TAKEN,
          actionTaken: FlagActionType.CONTENT_DELETED,
          adminNotes: adminNotes || undefined,
        },
      });

      toast({
        type: 'success',
        message: 'Content deleted successfully',
      });

      props?.onFlagUpdated?.();
      close();
    } catch (error: any) {
      toast({
        type: 'error',
        message: error?.message || 'Failed to delete content',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!flag) return;

    try {
      setActionLoading(true);
      await apiClient.updateFlag({
        query: { flagId: flag.id },
        payload: {
          status: FlagStatus.ACTION_TAKEN,
          actionTaken: FlagActionType.USER_BLOCKED,
          adminNotes: adminNotes || undefined,
        },
      });

      toast({
        type: 'success',
        message: 'User blocked successfully',
      });

      props?.onFlagUpdated?.();
      close();
    } catch (error: any) {
      toast({
        type: 'error',
        message: error?.message || 'Failed to block user',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Loading Flag Details...</DialogTitle>
          <DialogDescription>Loading flag information...</DialogDescription>
        </DialogHeader>
        <div className="p-8 text-center">Loading...</div>
      </>
    );
  }

  if (!flag) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Flag Not Found</DialogTitle>
          <DialogDescription>Flag not found or failed to load.</DialogDescription>
        </DialogHeader>
        <div className="p-8 text-center">
          <Button onClick={close}>Close</Button>
        </div>
      </>
    );
  }

  const contentUrl =
    flag.flaggedContent.type === 'post'
      ? `/entries/${flag.flaggedContent.id}`
      : `/${flag.flaggedContent.author.username}`;

  const contentTypeLabel = flag.flaggedContent.type === 'post' ? 'entry' : 'comment';

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Flag Details
          <Badge variant={STATUS_COLORS[flag.status]}>
            {STATUS_LABELS[flag.status]}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Reported {dateformat(flag.createdAt).format('MMM DD, YYYY')} by @{flag.reporter.username}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
        {/* Content Preview */}
        <div className="space-y-2">
          <Label>Flagged Content</Label>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">
                {contentTypeLabel}
              </Badge>
              <span className="text-xs text-gray-500">
                by{' '}
                <Link
                  href={`/${flag.flaggedContent.author.username}`}
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  @{flag.flaggedContent.author.username}
                </Link>
              </span>
            </div>
            <p className="text-sm text-gray-700 italic whitespace-pre-wrap">
              {flag.flaggedContent.preview}
            </p>
            <Link
              href={contentUrl}
              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
              target="_blank"
            >
              View full {contentTypeLabel} →
            </Link>
          </div>
        </div>

        {/* Flag Category */}
        <div className="space-y-2">
          <Label>Reason for Report</Label>
          <p className="text-sm capitalize">
            {flag.category.replace(/_/g, ' ').toLowerCase()}
          </p>
        </div>

        {/* Flag Description */}
        {flag.description && (
          <div className="space-y-2">
            <Label>Additional Details</Label>
            <p className="text-sm text-gray-700">{flag.description}</p>
          </div>
        )}

        {/* Reporter Info */}
        <div className="space-y-2">
          <Label>Reported By</Label>
          <Link
            href={`/${flag.reporter.username}`}
            className="text-sm text-blue-600 hover:underline"
            target="_blank"
          >
            @{flag.reporter.username}
          </Link>
        </div>

        {/* Admin Notes */}
        <div className="space-y-2">
          <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
          <Textarea
            id="adminNotes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about this flag..."
            maxLength={MAX_ADMIN_NOTES_LENGTH}
            rows={3}
            className="resize-none"
            disabled={flag.status !== FlagStatus.PENDING}
          />
          <p className="text-xs text-gray-500">{adminNotes.length}/{MAX_ADMIN_NOTES_LENGTH}</p>
        </div>

        {/* Previous Action Info */}
        {flag.status !== FlagStatus.PENDING && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Status:</strong> {STATUS_LABELS[flag.status]}
              {flag.actionTaken && ` - ${flag.actionTaken.replace(/_/g, ' ')}`}
            </p>
            {flag.reviewedBy && (
              <p className="text-sm text-gray-700">
                <strong>Reviewed by:</strong> @{flag.reviewedBy.username}
              </p>
            )}
            {flag.reviewedAt && (
              <p className="text-sm text-gray-700">
                <strong>Reviewed at:</strong>{' '}
                {dateformat(flag.reviewedAt).format('MMM DD, YYYY HH:mm')}
              </p>
            )}
            {flag.adminNotes && (
              <p className="text-sm text-gray-700 mt-2">
                <strong>Notes:</strong> {flag.adminNotes}
              </p>
            )}
          </div>
        )}
      </div>

      <DialogFooter className="flex gap-2">
        {flag.status === FlagStatus.PENDING ? (
          <>
            <Button variant="outline" onClick={close} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={actionLoading}
              loading={actionLoading}
            >
              Dismiss Flag
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContent}
              disabled={actionLoading}
              loading={actionLoading}
            >
              Delete Content
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockUser}
              disabled={actionLoading}
              loading={actionLoading}
            >
              Block User
            </Button>
          </>
        ) : (
          <Button onClick={close}>Close</Button>
        )}
      </DialogFooter>
    </>
  );
};

export default AdminFlagDetailsModal;
