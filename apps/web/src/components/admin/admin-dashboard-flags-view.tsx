'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, DataTable, DataTableColumn, Spinner } from '@repo/ui/components';
import { FlagStatus } from '@repo/types';
import Link from 'next/link';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { useSession, useModal } from '@/hooks';
import { dateformat } from '@/lib';
import { MODALS } from '@/components/modal/modal-registry';
import type { AdminFlagDetailsModalProps } from '@/components/modal';

// Constants
const FLAGS_PER_PAGE = 100;

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

export const AdminDashboardFlagsView = () => {
  const session = useSession();
  const modal = useModal();
  const [statusFilter, setStatusFilter] = useState<FlagStatus | 'all'>('all');

  const flagsQuery = useQuery({
    queryKey: [API_QUERY_KEYS.FLAGS, statusFilter],
    queryFn: () =>
      apiClient
        .getFlags({
          query: {
            status: statusFilter === 'all' ? undefined : statusFilter,
            limit: FLAGS_PER_PAGE,
            offset: 0,
          },
        })
        .then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const flags = flagsQuery.data?.flags || [];
  const total = flagsQuery.data?.total ?? 0;

  const handleViewFlag = (flagId: string) => {
    modal.open<AdminFlagDetailsModalProps>(MODALS.ADMIN_FLAG_DETAILS, {
      props: {
        flagId,
        onFlagUpdated: () => {
          flagsQuery.refetch();
        },
      },
    });
  };

  const columns: DataTableColumn[] = useMemo(() => [
    {
      id: 'content',
      header: 'Content Preview',
      cell: ({ row }) => {
        const flag = flags[row.index];
        return (
          <div className="flex flex-col gap-1 min-w-[300px]">
            <p className="text-sm font-medium truncate max-w-md">
              {flag.flaggedContent.preview}
            </p>
            <Link
              href={`/${flag.flaggedContent.author.username}`}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              by @{flag.flaggedContent.author.username}
            </Link>
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const flag = flags[row.index];
        return (
          <span className="text-sm capitalize min-w-[150px] block">
            {flag.category.replace(/_/g, ' ').toLowerCase()}
          </span>
        );
      },
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const flag = flags[row.index];
        const typeLabel = flag.flaggedContent.type === 'post' ? 'Entry' : 'Comment';
        return (
          <Badge variant="outline" className="capitalize">
            {typeLabel}
          </Badge>
        );
      },
    },
    {
      id: 'reporter',
      header: 'Reporter',
      cell: ({ row }) => {
        const flag = flags[row.index];
        return (
          <Link
            href={`/${flag.reporter.username}`}
            className="text-sm text-blue-600 hover:underline"
          >
            @{flag.reporter.username}
          </Link>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const flag = flags[row.index];
        return (
          <Badge variant={STATUS_COLORS[flag.status]}>
            {STATUS_LABELS[flag.status]}
          </Badge>
        );
      },
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const flag = flags[row.index];
        return (
          <span className="text-sm text-gray-600">
            {dateformat(flag.createdAt).format('MMM DD, YYYY')}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const flag = flags[row.index];
        return (
          <Button variant="outline" size="sm" onClick={() => handleViewFlag(flag.id)}>
            Review
          </Button>
        );
      },
    },
  ], [flags, handleViewFlag]);

  const tableData = flags.map((flag) => ({
    id: flag.id,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-2 border-b">
        {['all', FlagStatus.PENDING, FlagStatus.REVIEWED, FlagStatus.DISMISSED, FlagStatus.ACTION_TAKEN].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as FlagStatus | 'all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === status
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status as FlagStatus]}
            </button>
          ),
        )}
      </div>

      {/* Table */}
      {flagsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No flags found{statusFilter !== 'all' && ` with status: ${STATUS_LABELS[statusFilter as FlagStatus]}`}
        </div>
      ) : (
        <DataTable columns={columns} rows={tableData} results={total} />
      )}
    </div>
  );
};
