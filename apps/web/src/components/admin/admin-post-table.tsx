'use client';

import { ActionMenu } from '../menu';
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
  const [sponsorshipId, setSponsorshipId] = useState<string | null>(null);

  const handleCancelModal = (sponsorshipId: string) => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Cancel sponsorship',
        message: 'Are you sure you want to cancel this sponsorship?',
        submit: {
          buttonText: 'Confirm',
          onClick: () => handleCancelSubmit(sponsorshipId),
        },
      },
    });
  };

  const handleCancelSubmit = async (sponsorshipId: string) => {
    try {
      if (!sponsorshipId) return;

      setRowLoading(true);
      setSponsorshipId(sponsorshipId);

      // cancel the sponsorship
      const { success, message } = await apiClient.cancelSponsorship({
        query: { sponsorshipId },
      });

      if (success) {
        toast({
          type: 'success',
          message: LOCALES.APP.SPONSORSHIP.TOAST.CANCELED,
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
            href={postId ? ROUTER.POSTS.EDIT(postId) : '#'}
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
            href={ROUTER.MEMBERS.MEMBER(username)}
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
        const loading = rowLoading && rowId === sponsorshipId;
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
                        label: 'Edit',
                        onClick: () => {},
                      },
                      {
                        label: 'Delete',
                        onClick: () => {
                          confirm('delete?');
                        },
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
    ({ id, title, author, date }, key) => ({
      id: id ? id : `${key}`,
      title,
      creator: author?.username,
      date: date || new Date(),
    }),
  );

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.ACTION]);
  }, []);

  return (
    <div className="flex flex-col">
      <DataTable columns={columns} rows={rows} loading={loading} />
    </div>
  );
};
