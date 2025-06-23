import { Button } from '@repo/ui/components';
import { CheckCircleIcon, SealCheckIcon } from '@repo/ui/icons';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { apiClient } from '@/lib/api';

import { CloseButton, SubscriptionPlanUpgrade } from '@/components';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

export const metadata: Metadata = {
  title: 'Welcome to Explorer Pro',
};

export default async function Page() {
  const cookie = cookies().toString();

  const plansQuery = await apiClient.getSubscriptionPlans({
    cookie,
    cache: 'no-store',
  });

  const plan = plansQuery.data?.data?.[0];
  const features = {
    free: [],
    premium: LOCALES.APP.UPGRADE.PAGE.FEATURES,
  };

  return (
    <div className="bg-background relative w-full min-h-dvh flex flex-col justify-center items-center p-8">
      <div className="flex flex-col py-8 items-center">
        <div className="w-full max-w-xl flex flex-col items-center text-base gap-8">
          <SealCheckIcon size={80} weight="fill" />
          <h2 className="font-medium text-center text-5xl">
            {LOCALES.APP.UPGRADE.WELCOME.CTA.TITLE}
          </h2>
          <p className="text-center text-base">
            Your subscription is now active.{' '}
            {LOCALES.APP.UPGRADE.WELCOME.CTA.DESCRIPTION}
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center">
          <Button>
            <Link href={ROUTER.HOME}>Go to app</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
