import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { CheckoutLayout } from '@/layouts';

import { SponsorCheckoutSummary, SponsorshipCheckoutForm } from '@/components';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sponsor',
};

type Props = {
  params: {
    username: string;
  };
};

export default async function Page({ params }: Props) {
  const { username } = params;
  const cookie = cookies().toString();

  const [sponsorshipTierQuery, paymentMethodQuery, creatorQuery] =
    await Promise.all([
      apiClient.getSponsorshipTiersByUsername({ username }, { cookie }),
      apiClient.getUserPaymentMethods({ cookie }),
      apiClient.getUserByUsername({ username }, { cookie }),
    ]);

  const sponsorships = sponsorshipTierQuery.data?.data || [];
  const paymentMethods = paymentMethodQuery.data?.data;
  const creator = creatorQuery.data;

  return (
    <CheckoutLayout>
      <div className="w-full h-auto flex flex-col lg:flex-row lg:justify-between gap-14 py-4">
        <div className="basis-full lg:basis-6/12">
          <div className="flex flex-col gap-4">
            <span className="text-3xl font-medium">Sponsor</span>
          </div>
          <div className="mt-10 flex flex-col gap-10">
            {creator && (
              <div className="flex lg:hidden">
                <SponsorCheckoutSummary user={creator} />
              </div>
            )}
            <SponsorshipCheckoutForm
              username={username}
              sponsorships={sponsorships}
              paymentMethods={paymentMethods}
            />
          </div>
        </div>
        <div className="hidden basis-auto lg:flex lg:basis-4/12">
          {creator && <SponsorCheckoutSummary user={creator} />}
        </div>
      </div>
    </CheckoutLayout>
  );
}
