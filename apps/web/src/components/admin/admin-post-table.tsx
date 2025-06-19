'use client';

import { ActionMenu } from '../list/menu';
import { ActionModalProps, MODALS } from '../modal';
import {
  IPostDetail,
  ISponsorshipDetail,
  SponsorshipStatus,
  SponsorshipType,
} from '@repo/types';
import {
  Badge,
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
  const results = data.length || 0;

  const handleDeleteModal = (postId: string) => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Delete post',
        message: 'Are you sure you want to delete this post?',
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
  const columns: DataTableColumn<TableData>[] = [
    {
      accessorKey: 'title',
      header: () => 'Title',
      cell: ({ row }) => {
        const postId = row.original.id;
        const title = row.original.title;
        return (
          <Link
            href={postId ? ROUTER.ENTRIES.EDIT(postId) : '#'}
            target="_blank"
            className="underline font-medium"
          >
            {title}
          </Link>
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
    modal.preload([MODALS.ACTION]);
  }, []);

  return (
    <div className="flex flex-col gap-0">
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        results={results}
      />
    </div>
  );
};
