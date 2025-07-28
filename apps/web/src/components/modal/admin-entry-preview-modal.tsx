'use client';

import { Badge, Button, DialogHeader, DialogTitle, DialogDescription } from '@repo/ui/components';
import { IPostDetail } from '@repo/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';
import { dateformat } from '@/lib';
import { ROUTER } from '@/router';
import { ModalComponent } from './modal-registry';

export interface AdminEntryPreviewModalProps {
  entryId: string;
}

const AdminEntryPreviewModal: ModalComponent<AdminEntryPreviewModalProps> = ({
  props,
  close,
}) => {
  const [entry, setEntry] = useState<IPostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (props?.entryId) {
      fetchEntry(props.entryId);
    }
  }, [props?.entryId]);

  const fetchEntry = async (entryId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.getPostById({ query: { id: entryId } });
      setEntry(response.data || null);
    } catch (error) {
      console.error('Failed to fetch entry:', error);
      setEntry(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Loading Entry...</DialogTitle>
            <Button variant="ghost" size="sm" onClick={close}>
              ×
            </Button>
          </div>
          <DialogDescription>Loading entry data...</DialogDescription>
        </DialogHeader>
        <div className="p-8 text-center">Loading...</div>
      </>
    );
  }

  if (!entry) {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Entry Not Found</DialogTitle>
            <Button variant="ghost" size="sm" onClick={close}>
              ×
            </Button>
          </div>
          <DialogDescription>Entry not found or failed to load.</DialogDescription>
        </DialogHeader>
        <div className="p-8 text-center">Entry not found or failed to load.</div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Entry Preview</DialogTitle>
          <Button variant="ghost" size="sm" onClick={close}>
            ×
          </Button>
        </div>
        <DialogDescription>Admin preview of journal entry content and details.</DialogDescription>
      </DialogHeader>
      <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <h3 className="text-xl font-bold">{entry.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {entry.public ? 'Public' : 'Private'}
              </Badge>
              <span className="text-sm text-gray-500">
                {dateformat(entry.date).format('MMM DD, YYYY')}
              </span>
            </div>
          </div>

          {/* Author */}
          {entry.author && (
            <div>
              <label className="text-sm font-medium text-gray-600">Author</label>
              <div className="mt-1">
                <Link
                  href={ROUTER.USERS.DETAIL(entry.author.username)}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {entry.author.username}
                </Link>
              </div>
            </div>
          )}

          {/* Location */}
          {entry.waypoint && (
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <div className="mt-1">
                <span className="text-sm text-gray-500">
                  ({entry.waypoint.lat.toFixed(4)}, {entry.waypoint.lon.toFixed(4)})
                </span>
              </div>
            </div>
          )}

          {/* Media */}
          {entry.media && entry.media.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600">Media ({entry.media.length})</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {entry.media.slice(0, 4).map((media, index) => (
                  <div key={media.id} className="aspect-square bg-gray-100 rounded">
                    <img
                      src={media.thumbnail}
                      alt={`Entry media ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                ))}
                {entry.media.length > 4 && (
                  <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-sm text-gray-500">
                      +{entry.media.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-gray-600">Content</label>
            <div className="mt-2 prose prose-sm max-w-none">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: entry.content ? 
                    entry.content.substring(0, 500) + (entry.content.length > 500 ? '...' : '') 
                    : 'No content'
                }} 
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Link
              href={ROUTER.ENTRIES.DETAIL(entry.id)}
              target="_blank"
            >
              <Button variant="outline" size="sm">
                View Full Entry
              </Button>
            </Link>
            <Link
              href={ROUTER.ENTRIES.EDIT(entry.id)}
              target="_blank"
            >
              <Button variant="outline" size="sm">
                Edit Entry
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
};

export default AdminEntryPreviewModal;