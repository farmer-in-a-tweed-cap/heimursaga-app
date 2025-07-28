'use client';

import { ActionMenu } from '../list/menu';
import { ActionModalProps, AdminEntryPreviewModalProps, MODALS } from '../modal';
import {
  IPostDetail,
  ISponsorshipDetail,
  SponsorshipStatus,
  SponsorshipType,
} from '@repo/types';
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  DataTableColumn,
  DataTableRow,
  Spinner,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';

import { useModal } from '@/hooks';
import { dateformat } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

type TableData = {
  id: string;
  title: string;
  privacy: string;
  creator?: string;
  date: Date;
};

type Props = {
  data: IPostDetail[];
  refetch: () => void;
  loading?: boolean;
};

export const AdminPostTable: React.FC<Props> = ({
  data = [],
  loading = false,
  refetch,
}) => {
  const modal = useModal();
  const toast = useToast();

  const [rowLoading, setRowLoading] = useState<boolean>(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const results = data.length || 0;

  const handleDeleteModal = (postId: string) => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Delete entry',
        message: 'Are you sure you want to delete this entry?',
        submit: {
          buttonText: 'Delete',
          onClick: () => handleDeleteSubmit(postId),
        },
      },
    });
  };

  const handleDeleteSubmit = async (postId: string) => {
    try {
      if (!postId) return;

      setRowLoading(true);
      setPostId(postId);

      // delete the post
      const { success, message } = await apiClient.deletePost({
        query: { postId },
      });

      if (success) {
        toast({
          type: 'success',
          message: LOCALES.APP.POSTS.TOAST.DELETED,
        });
      } else {
        toast({ type: 'error', message: message || LOCALES.APP.ERROR.UNKNOWN });
      }

      if (refetch) {
        refetch();
      }

      setRowLoading(false);
    } catch (e) {
      setRowLoading(false);
    }
  };

  const handleBulkDeleteModal = () => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Delete entries',
        message: `Are you sure you want to delete ${selectedPosts.length} selected entrie(s)?`,
        submit: {
          buttonText: 'Delete All',
          onClick: () => handleBulkDeleteSubmit(),
        },
      },
    });
  };

  const handleBulkDeleteSubmit = async () => {
    try {
      setBulkLoading(true);
      
      // Delete all selected posts
      const promises = selectedPosts.map(postId => 
        apiClient.deletePost({ query: { postId } })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      
      if (successful > 0) {
        toast({
          type: 'success',
          message: `Successfully deleted ${successful} entrie(s)`,
        });
        setSelectedPosts([]);
        if (refetch) refetch();
      }
      
      setBulkLoading(false);
    } catch (e) {
      setBulkLoading(false);
      toast({ type: 'error', message: 'Failed to delete entries' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPostIds = data.map(post => post.id);
      setSelectedPosts(allPostIds);
    } else {
      setSelectedPosts([]);
    }
  };

  const handleSelectPost = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPosts(prev => [...prev, postId]);
    } else {
      setSelectedPosts(prev => prev.filter(p => p !== postId));
    }
  };

  const handleEntryPreview = (entryId: string) => {
    modal.open<AdminEntryPreviewModalProps>(MODALS.ADMIN_ENTRY_PREVIEW, {
      props: {
        entryId,
      },
    });
  };

  const columns: DataTableColumn<TableData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={selectedPosts.length === data.length && data.length > 0}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => {
        const postId = row.original.id;
        return (
          <Checkbox
            checked={selectedPosts.includes(postId)}
            onCheckedChange={(checked) => handleSelectPost(postId, checked as boolean)}
            aria-label="Select row"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: () => 'Title',
      cell: ({ row }) => {
        const postId = row.original.id;
        const title = row.original.title;
        return (
          <button
            onClick={() => handleEntryPreview(postId)}
            className="underline font-medium text-left hover:text-blue-600"
          >
            {title}
          </button>
        );
      },
    },
    {
      accessorKey: 'creator',
      header: () => 'Author',
      cell: ({ row }) => {
        const username = row.original.creator;
        return username ? (
          <Link
            href={ROUTER.USERS.DETAIL(username)}
            target="_blank"
            className="underline font-medium"
          >
            {username}
          </Link>
        ) : (
          <span>-</span>
        );
      },
    },
    {
      accessorKey: 'privacy',
      header: () => 'Privacy',
      cell: ({ row }) => {
        const privacy = row.original.privacy;
        return <Badge variant="outline">{privacy}</Badge>;
      },
    },
    // {
    //   accessorKey: 'status',
    //   header: () => 'Status',
    //   cell: ({ row }) => {
    //     const status = row.original?.status;
    //     return (
    //       <Badge
    //         variant={
    //           status === SponsorshipStatus.ACTIVE ||
    //           status === SponsorshipStatus.CONFIRMED
    //             ? 'success'
    //             : status === SponsorshipStatus.CANCELED
    //               ? 'destructive'
    //               : 'outline'
    //         }
    //       >
    //         {status}
    //       </Badge>
    //     );
    //   },
    // },
    {
      accessorKey: 'date',
      header: () => 'Date',
      cell: ({ row }) =>
        dateformat(row.getValue('date')).format('MMM DD, YYYY'),
    },
    {
      accessorKey: 'menu',
      header: () => '',
      cell: ({ row }) => {
        const rowId = row.original.id;
        const loading = rowLoading && rowId === postId;
        const actions = true;

        return (
          <div className="w-full flex flex-row justify-end items-center">
            {loading ? (
              <div className="w-[50px] h-[30px] flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              actions && (
                <div className="w-[50px] h-[30px] flex items-center justify-center">
                  <ActionMenu
                    actions={[
                      {
                        label: 'Delete',
                        onClick: () => handleDeleteModal(rowId),
                      },
                    ]}
                  />
                </div>
              )
            )}
          </div>
        );
      },
    },
  ];

  const rows: DataTableRow<TableData>[] = data.map(
    ({ id, title, author, date, ...post }, key) => ({
      id: id ? id : `${key}`,
      title,
      creator: author?.username,
      privacy: post.public ? 'Public' : 'Private',
      date: date || new Date(),
    }),
  );

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.ACTION, MODALS.ADMIN_ENTRY_PREVIEW]);
  }, []);


  return (
    <div className="flex flex-col">
      {selectedPosts.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-900">
              {selectedPosts.length} entrie(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteModal}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Spinner className="w-4 h-4" /> : 'Delete Selected'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPosts([])}
                disabled={bulkLoading}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        results={results}
      />
    </div>
  );
};
