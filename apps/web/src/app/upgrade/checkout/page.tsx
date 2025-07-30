import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import { CheckoutLayout } from '@/app/layout';

import {
  BulletList,
  PageNotFound,
} from '@/components';
import { CheckoutPageClient } from './checkout-page-client';
import { DEMO_DATA } from '@/constants';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upgrade to premium',
};

export default async function Page() {
  const cookie = cookies().toString();

  const planQuery = await apiClient.getSubscriptionBySlug(
    { query: { slug: 'premium' } },
    { cookie },
  );

  const plan = planQuery.data;
  const features = DEMO_DATA.PLANS[0].features;

  const isPlanActive = plan?.active || false;

  // redirect to the subscription page if plan is active
  if (isPlanActive) {
    redirect(ROUTER.UPGRADE);
  }

  return (
    <CheckoutLayout>
      {plan ? (
        <CheckoutPageClient plan={plan} />
      ) : (
        <PageNotFound />
      )}
    </CheckoutLayout>
  );
}
