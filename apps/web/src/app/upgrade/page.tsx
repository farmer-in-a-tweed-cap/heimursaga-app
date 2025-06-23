import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { CloseButton, SubscriptionPlanUpgrade } from '@/components';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upgrade',
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
    <div className="bg-background relative w-full min-h-dvh flex flex-col justify-start items-center p-8">
      <div className="absolute top-3 right-3 lg:top-4 lg:left-4">
        <CloseButton redirect={ROUTER.HOME} />
      </div>
      <div className="flex flex-col py-8 items-center">
        <div className="w-full max-w-xl flex flex-col items-center text-base gap-6">
          <h2 className="font-medium text-5xl">
            {LOCALES.APP.UPGRADE.PAGE.CTA.TITLE}
          </h2>
          <p className="text-center">
            {LOCALES.APP.UPGRADE.PAGE.CTA.DESCRIPTION}
          </p>
        </div>
        {plan && (
          <SubscriptionPlanUpgrade
            {...plan}
            name={LOCALES.APP.UPGRADE.PLAN.TITLE}
            features={features.premium}
          />
        )}
      </div>
    </div>
  );
}
