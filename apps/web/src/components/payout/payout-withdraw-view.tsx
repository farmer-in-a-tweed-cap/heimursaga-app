'use client';

import { ActionModalProps, InfoModalProps, MODALS } from '../modal';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { useModal, useSession } from '@/hooks';

import { PayoutActivityTable } from './payout-activity-table';

export const PayoutWithdrawView = () => {
  const session = useSession();
  const modal = useModal();
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const balanceQuery = useQuery({
    queryKey: [API_QUERY_KEYS.BALANCE],
    queryFn: () => apiClient.getBalance().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutQuery = useQuery({
    queryKey: [API_QUERY_KEYS.PAYOUTS],
    queryFn: () => apiClient.getPayouts().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutMethodQuery = useQuery({
    queryKey: [API_QUERY_KEYS.PAYOUT_METHODS],
    queryFn: () => apiClient.getUserPayoutMethods().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutBalance = balanceQuery.data;
  const withdrawalDisabled = payoutBalance?.available?.amount
    ? payoutBalance?.available?.amount <= 0
    : true;

  const payouts = payoutQuery.data?.data || [];
  const payoutMethod = payoutMethodQuery?.data?.data?.[0];
  const automaticPayouts = payoutMethod?.automaticPayouts;

  const amount = 5;
  const symbol = payoutBalance?.available?.symbol || '$';
  const balance = {
    available: payoutBalance?.available?.amount || 0,
    pending: payoutBalance?.pending?.amount || 0,
  };

  const handlePayoutSubmit = async () => {
    try {
      setLoading(true);

      // const amount = balance.available;

      // create a payout
      const { success, message } = await apiClient.createPayout({
        query: {},
        payload: { amount },
      });

      if (success) {
        toast({ type: 'success', message: 'Payout successfully created.' });
        payoutQuery.refetch();
        balanceQuery.refetch();
      } else {
        toast({
          type: 'error',
          message: message ? message : 'payout not created',
        });
      }

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const handleWithdrawModal = () => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Withdrawal',
        message: `Are you sure you want to withdraw ${symbol}${amount}?`,
        submit: {
          buttonText: 'Confirm',
          onClick: handlePayoutSubmit,
        },
      },
    });
  };

  useEffect(() => {
    modal.preload([MODALS.ACTION]);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {balanceQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  Available to withdraw
                </span>
                <div className="mt-2 flex flex-row items-center text-3xl font-semibold">
                  <span>{symbol}</span>
                  <span>{balance.available.toFixed(2)}</span>
                </div>
                
                {/* Automatic Payout Status */}
                {automaticPayouts && (
                  <div className="mt-3">
                    {automaticPayouts.enabled ? (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-xs text-green-700 font-medium">
                          Auto-payouts: {automaticPayouts.schedule?.interval}
                          {automaticPayouts.schedule?.delayDays && ` (${automaticPayouts.schedule.delayDays}d delay)`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-600 font-medium">
                          Manual payouts only
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex mt-4">
                <Button
                  disabled={withdrawalDisabled}
                  loading={loading}
                  onClick={handleWithdrawModal}
                >
                  Withdraw
                </Button>
              </div>
              {balance.pending > 0 && (
                <div className="mt-8 flex flex-col gap-1">
                  <span>Pending</span>
                  <div className="flex flex-row items-center text-sm text-gray-600 font-medium">
                    <span>{symbol}</span>
                    <span>{balance.pending.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <PayoutActivityTable
                data={payouts}
                loading={payoutQuery.isLoading}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
