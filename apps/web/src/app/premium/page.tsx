import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { CloseButton, SubscriptionPlanUpgrade } from '@/components';
import { DEMO_DATA } from '@/constants';
import { ROUTER } from '@/router';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upgrade to premium',
};

export default async function Page() {
  const cookie = cookies().toString();

  const plansQuery = await apiClient.getSubscriptionPlans({ cookie });

  const plan = plansQuery.data?.data?.[0];
  const features = {
    free: [],
    premium: DEMO_DATA.PLANS?.[0]?.features || [],
  };

  return (
    <div className="bg-background relative w-full min-h-dvh flex flex-col justify-start items-center p-8">
      <div className="absolute top-3 right-3 lg:top-4 lg:left-4">
        <CloseButton redirect={ROUTER.HOME} />
      </div>

      <div className="flex flex-col py-8 items-center">
        <div className="w-full max-w-xl flex flex-col items-center text-base gap-6">
          <h2 className="font-medium text-5xl">Upgrade to Premium</h2>
          <p className="text-center">
            Enjoy an enhanced experience, exclusive creator tools, top-tier
            verification and security.
          </p>
        </div>

        {plan && (
          <SubscriptionPlanUpgrade {...plan} features={features.premium} />
        )}
      </div>
    </div>
  );
}
