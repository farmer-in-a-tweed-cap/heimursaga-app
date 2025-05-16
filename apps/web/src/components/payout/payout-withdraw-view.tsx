'use client';

import { Button, Card, CardContent, LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

export const PayoutWithdrawView = () => {
  const session = useSession();

  const payoutBalanceQuery = useQuery({
    queryKey: [QUERY_KEYS.PAYOUT_BALANCE],
    queryFn: () => apiClient.getUserPayoutBalance().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutBalance = payoutBalanceQuery.data;

  return (
    <div className="flex flex-col gap-2">
      {payoutBalanceQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <CardContent>
            <div className="flex flex-col">
              <span className="font-medium text-sm">Available to withdraw</span>
              <div className="mt-4 flex flex-row items-center text-3xl font-semibold">
                <span>$</span>
                <span>500</span>
              </div>
            </div>
            <div className="flex mt-4">
              <Button
                disabled={
                  payoutBalance?.available?.amount
                    ? payoutBalance?.available?.amount <= 0
                    : true
                }
              >
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
