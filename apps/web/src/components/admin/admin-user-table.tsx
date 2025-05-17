'use client';

import { ActionMenu } from '../menu';
import { ActionModalProps, MODALS } from '../modal';
import { UserAvatar } from '../user';
import { IUserDetail } from '@repo/types';
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
  username: string;
  role: string;
  name: string;
  picture: string;
  posts: number;
  memberDate?: Date;
};

type Props = {
  data: IUserDetail[];
  refetch: () => void;
  loading?: boolean;
};

export const AdminUserTable: React.FC<Props> = ({
  data = [],
  loading = false,
  refetch,
}) => {
  const modal = useModal();
  const toast = useToast();

  const [rowLoading, setRowLoading] = useState<boolean>(false);
  const [sponsorshipId, setSponsorshipId] = useState<string | null>(null);
  const results = data.length || 0;

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
    // {
    //   accessorKey: 'title',
    //   header: () => 'Title',
    //   cell: ({ row }) => {
    //     const postId = row.original.id;
    //     const title = row.original.title;
    //     return (
    //       <Link
    //         href={postId ? ROUTER.POSTS.EDIT(postId) : '#'}
    //         target="_blank"
    //         className="underline font-medium"
    //       >
    //         {title}
    //       </Link>
    //     );
    //   },
    // },
    {
      accessorKey: 'user',
      header: () => 'User',
      cell: ({ row }) => {
        const username = row.original.username;
        const name = row.original.name;
        const picture = row.original.picture;
        return username ? (
          <Link
            href={ROUTER.MEMBERS.MEMBER(username)}
            target="_blank"
            className="flex flex-row items-center justify-start gap-2"
          >
            <UserAvatar className="w-7 h-7" src={picture} fallback={name} />
            <span className="underline font-medium">{username}</span>
          </Link>
        ) : (
          <span>-</span>
        );
      },
    },
    {
      accessorKey: 'role',
      header: () => 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        return <Badge variant="outline">{role}</Badge>;
      },
    },
    {
      accessorKey: 'posts',
      header: () => 'Posts',
      cell: ({ row }) => row.getValue('posts'),
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
      header: () => 'Member date',
      cell: ({ row }) => {
        const date = row.original.memberDate;
        return date ? dateformat(date).format('MMM DD, YYYY') : '-';
      },
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
                        label: 'Block',
                        onClick: () => {
                          confirm('block?');
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
    ({ name, username, role, postsCount = 0, memberDate, picture }) => ({
      id: username,
      username,
      name,
      role,
      posts: postsCount,
      memberDate,
      picture,
    }),
  );

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.ACTION]);
  }, []);

  return (
    <div className="flex flex-col">
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        results={results}
      />
    </div>
  );
};
