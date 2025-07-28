'use client';

import { ActionMenu } from '../list/menu';
import { ActionModalProps, AdminUserPreviewModalProps, MODALS } from '../modal';
import { UserAvatar } from '../user';
import { IUserDetail } from '@repo/types';
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
  username: string;
  role: string;
  // name: string;
  picture: string;
  posts: number;
  blocked?: boolean;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const results = data.length || 0;

  const handleBlockModal = (userId: string) => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Block user',
        message: 'Are you sure you want to block this user?',
        submit: {
          buttonText: 'Block',
          onClick: () => handleBlockSubmit(userId),
        },
      },
    });
  };

  const handleBlockSubmit = async (userId: string) => {
    try {
      if (!userId) return;

      setRowLoading(true);
      setUserId(userId);

      // block the user
      const { success, message } = await apiClient.blockUser({
        query: { username: userId },
      });

      if (success) {
        toast({
          type: 'success',
          message: LOCALES.APP.USERS.TOAST.BLOCKED,
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

  const handleBulkBlockModal = () => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Block users',
        message: `Are you sure you want to block ${selectedUsers.length} selected user(s)?`,
        submit: {
          buttonText: 'Block All',
          onClick: () => handleBulkBlockSubmit(),
        },
      },
    });
  };

  const handleBulkBlockSubmit = async () => {
    try {
      setBulkLoading(true);
      
      // Block all selected users
      const promises = selectedUsers.map(username => 
        apiClient.blockUser({ query: { username } })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      
      if (successful > 0) {
        toast({
          type: 'success',
          message: `Successfully blocked ${successful} user(s)`,
        });
        setSelectedUsers([]);
        if (refetch) refetch();
      }
      
      setBulkLoading(false);
    } catch (e) {
      setBulkLoading(false);
      toast({ type: 'error', message: 'Failed to block users' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUsernames = data.filter(user => !user.blocked).map(user => user.username);
      setSelectedUsers(allUsernames);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (username: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, username]);
    } else {
      setSelectedUsers(prev => prev.filter(u => u !== username));
    }
  };

  const handleUserPreview = (user: IUserDetail) => {
    modal.open<AdminUserPreviewModalProps>(MODALS.ADMIN_USER_PREVIEW, {
      props: {
        user,
      },
    });
  };

  const columns: DataTableColumn<TableData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            selectedUsers.length === data.filter(user => !user.blocked).length && 
            data.filter(user => !user.blocked).length > 0
          }
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => {
        const username = row.original.username;
        const blocked = row.original.blocked || false;
        return (
          <Checkbox
            checked={selectedUsers.includes(username)}
            onCheckedChange={(checked) => handleSelectUser(username, checked as boolean)}
            aria-label="Select row"
            disabled={blocked}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    // {
    //   accessorKey: 'title',
    //   header: () => 'Title',
    //   cell: ({ row }) => {
    //     const postId = row.original.id;
    //     const title = row.original.title;
    //     return (
    //       <Link
    //         href={postId ? ROUTER.ENTRIES.EDIT(postId) : '#'}
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
        const name = row.original.username;
        const blocked = row.original.blocked || false;
        const picture = row.original.picture;
        return username ? (
          <button
            onClick={() => {
              const userData = data.find(u => u.username === username);
              if (userData) handleUserPreview(userData);
            }}
            className="flex flex-row items-center justify-start gap-2 hover:bg-gray-50 p-1 rounded"
          >
            <UserAvatar className="w-7 h-7" src={picture || undefined} fallback={name} />
            <span className="underline font-medium">{username}</span>
            {blocked && <Badge variant="destructive">Blocked</Badge>}
          </button>
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
      header: () => 'Entries',
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
        const username = row.original.username;
        const blocked = row.original.blocked || false;
        const loading = rowLoading && username === userId;
        const actions = [];

        if (!blocked) {
          actions.push({
            label: 'Block',
            onClick: () => handleBlockModal(username),
          });
        }

        return (
          <div className="w-full flex flex-row justify-end items-center">
            {loading ? (
              <div className="w-[50px] h-[30px] flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              actions.length >= 1 && (
                <div className="w-[50px] h-[30px] flex items-center justify-center">
                  <ActionMenu actions={actions} />
                </div>
              )
            )}
          </div>
        );
      },
    },
  ];

  const rows: DataTableRow<TableData>[] = data.map(
    ({
      username,
      role = '',
      postsCount = 0,
      blocked,
      memberDate,
      picture,
    }) => ({
      id: username,
      username,
      name,
      role,
      blocked,
      posts: postsCount,
      memberDate,
      picture,
    }),
  );

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.ACTION, MODALS.ADMIN_USER_PREVIEW]);
  }, []);


  return (
    <div className="flex flex-col">
      {selectedUsers.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkBlockModal}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Spinner className="w-4 h-4" /> : 'Block Selected'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUsers([])}
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
