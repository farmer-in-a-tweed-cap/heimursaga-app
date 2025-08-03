'use client';

import { ActionMenu } from '../list/menu';
import { ActionModalProps, MODALS } from '../modal';
import {
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';

import { useModal } from '@/hooks';
import { dateformat } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

type SponsorshipTableData = {
  id: string;
  username: string;
  type: SponsorshipType;
  amount: number;
  date?: Date;
  status: string;
  message?: string;
  email_delivery_enabled?: boolean;
};

type Props = {
  data: ISponsorshipDetail[];
  results?: number;
  refetch: () => void;
  context: 'user' | 'creator';
  loading?: boolean;
};

export const SponsorshipsTable: React.FC<Props> = ({
  data = [],
  results = 0,
  loading = false,
  context,
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

  const handleToggleEmailDelivery = async (sponsorshipId: string, enabled: boolean) => {
    try {
      if (!sponsorshipId) return;

      setRowLoading(true);
      setSponsorshipId(sponsorshipId);

      // toggle email delivery
      const { success, message } = await apiClient.toggleSponsorshipEmailDelivery({
        query: { sponsorshipId },
        payload: { enabled },
      });

      if (success) {
        toast({
          type: 'success',
          message: `Email delivery ${enabled ? 'enabled' : 'disabled'}`,
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
  const columns: DataTableColumn<SponsorshipTableData>[] = [
    {
      accessorKey: 'username',
      header: () => (context === 'user' ? 'Explorer' : 'User'),
      cell: ({ row }) => {
        const username = row.original.username;
        return (
          <Link
            href={username ? ROUTER.USERS.DETAIL(username) : '#'}
            target="_blank"
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
      accessorKey: 'message',
      header: () => 'Message',
      cell: ({ row }) => {
        const value =
          typeof row.getValue('message') === 'string'
            ? (row.getValue('message') as string)
            : '';

        const message = {
          preview: value.length >= 10 ? `${value.slice(0, 10)}..` : value,
          content: value,
        };

        return (
          <Tooltip>
            <TooltipTrigger>{message.preview}</TooltipTrigger>
            <TooltipContent
              side="top"
              className="w-full max-w-[400px] break-all p-2"
            >
              {message.content}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'menu',
      header: () => '',
      cell: ({ row }) => {
        const rowId = row.original.id;
        const loading = rowLoading && rowId === sponsorshipId;
        const status = row.original?.status;
        const actions =
          row.original?.type === SponsorshipType.SUBSCRIPTION &&
          status === SponsorshipStatus.ACTIVE;

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
                        label: row.original.email_delivery_enabled ? 'Disable emails' : 'Enable emails',
                        onClick: () => handleToggleEmailDelivery(rowId, !row.original.email_delivery_enabled),
                      },
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

  const rows: DataTableRow<SponsorshipTableData>[] = data.map(
    ({ id, creator, amount, type, createdAt, status, user, message, email_delivery_enabled }, key) => ({
      id: id ? id : `${key}`,
      type,
      status,
      username: (context === 'user' ? creator?.username : user?.username) || '',
      amount,
      date: createdAt,
      message,
      email_delivery_enabled,
    }),
  );

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.ACTION]);
  }, []);

  return (
    <div className="flex flex-col">
      <DataTable
        results={results}
        columns={columns}
        rows={rows}
        loading={loading}
      />
    </div>
  );
};
