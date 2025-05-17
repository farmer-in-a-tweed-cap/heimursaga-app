'use client';

import { ActionMenu } from '../menu';
import { ActionModalProps, MODALS } from '../modal';
import { SponsorshipStatus, SponsorshipType } from '@repo/types';
import {
  Badge,
  DataTable,
  DataTableColumn,
  DataTableRow,
  LoadingSpinner,
  Spinner,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useModal, useSession } from '@/hooks';
import { dateformat } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

type SponsorshipTableData = {
  id: string;
  username: string;
  status: string;
  type: SponsorshipType;
  amount: number;
  date?: Date;
};

export const UserSettingsSponsorshipsView = () => {
  const session = useSession();
  const modal = useModal();
  const toast = useToast();

  const [sponsorshipId, setSponsorshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const sponsorshipQuery = useQuery({
    queryKey: [QUERY_KEYS.USER.SPONSORSHIPS],
    queryFn: () => apiClient.getUserSponsorships().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

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

      setLoading(true);
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

      await sponsorshipQuery.refetch();

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const sponsorships = sponsorshipQuery.data?.data || [];

  const columns: DataTableColumn<SponsorshipTableData>[] = [
    {
      accessorKey: 'username',
      header: () => 'Creator',
      cell: ({ row }) => {
        const username = row.original.username;
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
      accessorKey: 'amount',
      header: () => 'Amount',
      cell: ({ row }) => <span>${row.getValue('amount')}</span>,
    },
    {
      accessorKey: 'status',
      header: () => 'Status',
      cell: ({ row }) => {
        const status = row.original?.status;
        return (
          <Badge
            variant={
              status === SponsorshipStatus.ACTIVE ||
              status === SponsorshipStatus.CONFIRMED
                ? 'success'
                : status === SponsorshipStatus.CANCELED
                  ? 'destructive'
                  : 'outline'
            }
          >
            {status}
          </Badge>
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
        const rowLoading = loading && rowId === sponsorshipId;
        const status = row.original?.status;
        const actions =
          row.original?.type === SponsorshipType.SUBSCRIPTION &&
          status === SponsorshipStatus.ACTIVE;

        return (
          <div className="w-full flex flex-row justify-end items-center">
            {rowLoading ? (
              <div className="w-[50px] h-[30px] flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              actions && (
                <div className="w-[50px] h-[30px] flex items-center justify-center">
                  <ActionMenu
                    actions={[
                      {
                        label: 'Cancel',
                        onClick: () => handleCancelModal(rowId),
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

  const rows: DataTableRow<SponsorshipTableData>[] = sponsorships.map(
    ({ id, creator, amount, type, createdAt, status }, key) => ({
      id: id ? id : `${key}`,
      type,
      status,
      username: creator?.username || '',
      amount,
      date: createdAt,
    }),
  );

  useEffect(() => {
    modal.preload([MODALS.ACTION]);
  }, []);

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
