'use client';

import { Button } from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';
import { redirect, sleep } from '@/lib/utils';

import { ActionModalProps, MODALS } from '@/components';
import { useModal } from '@/hooks';
import { ROUTER } from '@/router';

import { SubscriptionPlanCard } from './subscription-plan-card';

type Props = {
  name?: string;
  currencySymbol?: string;
  priceMonthly?: number;
  priceYearly?: number;
  discountYearly?: number;
  features?: string[];
  active?: boolean;
  expiry?: Date;
};

export const SubscriptionPlanUpgrade: React.FC<Props> = ({
  name = '',
  priceMonthly = 0,
  priceYearly = 0,
  discountYearly = 0,
  currencySymbol = '$',
  features = [],
  active = false,
  expiry,
}) => {
  const modal = useModal();
  const toast = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);

  const handleUpgrade = () => {
    redirect(ROUTER.PREMIUM_CHECKOUT);
  };

  const handleDowngrade = async () => {
    try {
      setLoading(true);

      await sleep(1000);

      const downgrade = await apiClient.downgradeSubscriptionPlan();

      if (!downgrade.success) {
        toast({ type: 'error', message: 'Downgrade failed' });
        return;
      }

      toast({ type: 'success', message: 'Downgrade successful' });
      router.refresh();
    } catch (e) {
      toast({ type: 'error', message: 'Downgrade failed' });
      setLoading(false);
    }
  };

  const handleDowngradeConfirmationModal = () => {
    modal.open<ActionModalProps>(MODALS.ACTION, {
      props: {
        title: 'Downgrade',
        message:
          'Are you sure you want to cancel and downgrade your premium subscription?',
        submit: {
          buttonText: 'Downgrade',
          onClick: () => {
            handleDowngrade();
          },
        },
        cancel: {
          buttonText: 'Discard',
        },
      },
    });
  };

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.ACTION]);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mt-10 w-full max-w-lg grid gap-4">
        <SubscriptionPlanCard
          {...{
            name,
            priceMonthly,
            priceYearly,
            discountYearly,
            currencySymbol,
            active,
            expiry,
            features,
          }}
        />
      </div>
      <div className="mt-6 w-full max-w-xl flex flex-col justify-center items-center">
        {active ? (
          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto sm:min-w-[200px]"
            loading={loading}
            onClick={handleDowngradeConfirmationModal}
          >
            Cancel & downgrade
          </Button>
        ) : (
          <div>
            <Button size="lg" onClick={handleUpgrade}>
              Upgrade
            </Button>
          </div>
        )}
        <div className="mt-10">
          <p className="text-xs text-gray-500 text-center">
            By subscribing, you agree to our Purchaser Terms of Service.
            Subscriptions auto-renew until canceled. Cancel anytime, at least 24
            hours prior to renewal to avoid additional charges. Manage your
            subscription through the platform you subscribed on.
          </p>
        </div>
      </div>
    </div>
  );
};
