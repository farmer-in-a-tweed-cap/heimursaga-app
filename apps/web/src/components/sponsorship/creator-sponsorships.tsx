'use client';

import { ActionMenu } from '../menu';
import { SponsorshipType } from '@repo/types';
import {
  Badge,
  DataTable,
  DataTableColumn,
  DataTableRow,
} from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';
import { dateformat } from '@/lib';
import { ROUTER } from '@/router';

type SponsorshipTableData = {
  username: string;
  type: SponsorshipType;
  amount: number;
  date?: Date;
};

export const CreatorSponsorships = () => {
  const session = useSession();

  const sponsorshipQuery = useQuery({
    queryKey: [QUERY_KEYS.SPONSORSHIPS],
    queryFn: () => apiClient.getCreatorSponsorships().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const sponsorships = sponsorshipQuery.data?.data || [];

  const columns: DataTableColumn<SponsorshipTableData>[] = [
    {
      accessorKey: 'username',
      header: () => 'User',
      cell: ({ row }) => {
        const username = row.getValue('username') as string;
        return (
          <Link
            href={username ? ROUTER.MEMBERS.MEMBER(username) : '#'}
            className="underline font-medium"
          >
            @{username}
          </Link>
        );
      },
    },
    {
      accessorKey: 'type',
      header: () => 'Type',
      cell: ({ row }) => {
        const value = row.getValue('type');
        const label =
          value === SponsorshipType.ONE_TIME_PAYMENT
            ? 'one-time'
            : 'subscription';
        return <Badge variant="outline">{label}</Badge>;
      },
    },
    {
      accessorKey: 'amount',
      header: () => 'Amount',
      cell: ({ row }) => <span>${row.getValue('amount')}</span>,
    },
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
        const subscription =
          row.original?.type === SponsorshipType.SUBSCRIPTION || false;
        return (
          <div className="w-full flex flex-row justify-end">
            {subscription && (
              <ActionMenu
                actions={
                  subscription
                    ? [
                        {
                          label: 'Cancel',
                          onClick: () => {
                            confirm('do you want to cancel this sponsorship?');
                          },
                        },
                      ]
                    : []
                }
              />
            )}
          </div>
        );
      },
    },
  ];

  const rows: DataTableRow<SponsorshipTableData>[] = sponsorships.map(
    ({ id, user, amount, type, createdAt }, key) => ({
      id: id ? id : `${key}`,
      type,
      username: user?.username || '',
      amount,
      date: createdAt,
    }),
  );

  return (
    <div className="flex flex-col">
      <DataTable
        columns={columns}
        rows={rows}
        loading={sponsorshipQuery.isLoading}
      />
    </div>
  );
};
