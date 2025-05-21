'use client';

import { CountryCode, PayoutMethodPlatform } from '@repo/types';
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

export const PayoutBillingView = () => {
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

  const payoutMethod = payoutMethodQuery?.data?.data?.[0];
  const updateAvailable = !!payoutMethod?.id;

  const handlePayoutMethodCreate = async () => {
    try {
      setLoading((loading) => ({ ...loading, button: true }));

      // create a payout method
      const response = await apiClient.createPayoutMethod({
        platform: PayoutMethodPlatform.STRIPE,
        country: CountryCode.UNITED_STATES,
      });

      if (!response.success) {
        toast({ type: 'error', message: 'payout method not created' });
        setLoading((loading) => ({ ...loading, button: false }));
        return;
      }

      const onboardingUrl = response.data?.platform?.onboardingUrl;

      // redirect to the payout method platform onboarding page
      if (onboardingUrl) {
        return redirect(onboardingUrl);
      }
    } catch (e) {
      setLoading((loading) => ({ ...loading, button: false }));
      toast({ type: 'error', message: 'payout method not created' });
    }
  };

  const handlePayoutMethodUpdate = async () => {
    try {
      const payoutMethodId = payoutMethod?.id;

      if (!payoutMethodId) {
        toast({
          type: 'error',
          message: 'payout method not available',
        });
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

  return (
    <div className="flex flex-col">
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
                  payoutMethod.isVerified ? (
                    <span className="text-base font-medium">
                      {payoutMethod?.email || '******'}
                    </span>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )
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
                    disabled={!updateAvailable}
                    onClick={handlePayoutMethodUpdate}
                  >
                    {payoutMethod.isVerified ? 'Update' : 'Complete setup'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    loading={loading.button}
                    disabled={updateAvailable}
                    onClick={handlePayoutMethodCreate}
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
