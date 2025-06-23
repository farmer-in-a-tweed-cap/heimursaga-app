'use client';

import {
  CountryCode,
  PayoutMethodPlatform,
  StripePlayformAccountLinkMode,
} from '@repo/types';
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

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { useModal, useSession } from '@/hooks';
import { getBaseAppUrl, redirect } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

export const PayoutBillingView = () => {
  const router = useRouter();
  const session = useSession();
  const modal = useModal();
  const toast = useToast();

  const [loading, setLoading] = useState({ button: false });

  const payoutMethodQuery = useQuery({
    queryKey: [API_QUERY_KEYS.PAYOUT_METHODS],
    queryFn: () => apiClient.getUserPayoutMethods().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const payoutMethod = payoutMethodQuery?.data?.data?.[0];
  const updateAvailable = !!payoutMethod?.id;

  const stripeBackUrl = process?.env?.NEXT_PUBLIC_APP_BASE_URL
    ? new URL(
        ROUTER.PAYOUTS.BILLING,
        process?.env?.NEXT_PUBLIC_APP_BASE_URL,
      ).toString()
    : '';

  const handlePayoutMethodCreate = async () => {
    try {
      setLoading((loading) => ({ ...loading, button: true }));

      // create a payout method
      const payoutMethodResponse = await apiClient.createPayoutMethod({
        country: CountryCode.UNITED_STATES,
      });

      if (payoutMethodResponse.success) {
        const payoutMethodId = payoutMethodResponse.data?.payoutMethodId;

        // get a stripe platform account link
        if (payoutMethodId) {
          const stripePlatformAccountLinkResponse =
            await apiClient.generateStripePlatformAccountLink({
              query: {},
              payload: {
                mode: StripePlayformAccountLinkMode.UPDATE,
                payoutMethodId,
                backUrl: stripeBackUrl,
              },
            });
          const stripeUrl = stripePlatformAccountLinkResponse.data?.url;

          // redirect to the stripe platform account link
          if (stripeUrl) {
            return redirect(stripeUrl);
          }
        }
      } else {
        toast({ type: 'error', message: 'payout method not created' });
        setLoading((loading) => ({ ...loading, button: false }));
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
      const { success, data } =
        await apiClient.generateStripePlatformAccountLink({
          query: {},
          payload: {
            mode: StripePlayformAccountLinkMode.UPDATE,
            payoutMethodId,
            backUrl: stripeBackUrl,
          },
        });

      if (success) {
        const url = data?.url;

        // redirect to the stripe platform account link
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
              <span className="text-sm font-normal">
                {LOCALES.APP.PAYOUTS.BILLING.STRIPE.TITLE}
              </span>
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
                  {LOCALES.APP.PAYOUTS.BILLING.STRIPE.PAYOUT_FEE_WARNING}
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
