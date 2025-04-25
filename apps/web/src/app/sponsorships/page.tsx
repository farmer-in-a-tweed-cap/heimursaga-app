import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { SponsorshipTierManageCard } from '@/components/sponsorship';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sponsorships',
};

export default async function Page() {
  const cookie = cookies().toString();

  const sponsorshipTierQuery = await apiClient.getUserSponsorshipTiers({
    cookie,
    cache: 'no-store',
  });

  const sponsorshipTier = sponsorshipTierQuery.data?.data?.[0];

  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <PageHeaderTitle>Sponsorships</PageHeaderTitle>
        <div className="mt-4">
          {sponsorshipTier && (
            <SponsorshipTierManageCard
              id={sponsorshipTier.id}
              price={sponsorshipTier.price}
              description={sponsorshipTier.description}
              isAvailable={sponsorshipTier.isAvailable}
              membersCount={sponsorshipTier.membersCount}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
