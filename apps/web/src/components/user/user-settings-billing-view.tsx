'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useModal, useSession } from '@/hooks';
import { redirect } from '@/lib';

export const UserSettingsBillingView = () => {
  const router = useRouter();
  const session = useSession();
  const modal = useModal();
  const toast = useToast();

  const [loading, setLoading] = useState({ button: false });

  const payoutMethodQuery = useQuery({
    queryKey: [QUERY_KEYS.PAYOUT_METHODS],
    queryFn: () => apiClient.getUserPayoutMethods().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutBalanceQuery = useQuery({
    queryKey: [QUERY_KEYS.PAYOUT_BALANCE],
    queryFn: () => apiClient.getUserPayoutBalance().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutBalance = payoutBalanceQuery?.data;
  const payoutMethod = payoutMethodQuery?.data?.data?.[0];

  const handlePayoutMethodConnect = () => {};

  const handlePayoutMethodUpdate = async () => {
    try {
      const payoutMethodId = payoutMethod?.id;

      if (!payoutMethodId) {
        return;
      }

      setLoading((loading) => ({ ...loading, button: true }));

      // get a payout method platform link
      const response = await apiClient.getPayoutMethodPlatformLink({
        query: { id: payoutMethodId },
      });

      if (response.success) {
        const url = response.data?.url;

        // redirect to the payout method platform link
        if (url) {
          return redirect(url);
        }
      } else {
        toast({ type: 'error', message: 'payout method not updated' });
      }

      setLoading((loading) => ({ ...loading, button: false }));
    } catch (e) {
      setLoading((loading) => ({ ...loading, button: false }));
      toast({ type: 'error', message: 'payout method not updated' });
    }
  };

  // // cache modals
  // useEffect(() => {
  //   modal.preload([MODALS.PAYMENT_METHOD_ADD, MODALS.PAYMENT_METHOD_DELETE]);
  // }, [modal.preload]);

  return (
    <div className="flex flex-col">
      {JSON.stringify({ b: payoutBalance })}
      {payoutMethodQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payout method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-start items-start">
              <span className="text-sm font-normal">Stripe</span>
              <div>
                {payoutMethod ? (
                  <span className="text-base font-medium">
                    {payoutMethod?.email || '******'}
                  </span>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
              </div>
              <div className="mt-3">
                <span className="text-sm text-gray-500">
                  Payout fee is 1% of the amount transferred, with a minimum of
                  USD $0.25 and a maximum of USD $20*
                </span>
              </div>
              <div className="mt-6">
                {payoutMethod ? (
                  <Button
                    variant="outline"
                    loading={loading.button}
                    onClick={handlePayoutMethodUpdate}
                  >
                    Update
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    loading={loading.button}
                    onClick={handlePayoutMethodConnect}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
