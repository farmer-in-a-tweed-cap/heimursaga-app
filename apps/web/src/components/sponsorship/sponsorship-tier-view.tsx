'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { SponsorshipTierManageCard } from './sponsorship-tier-manage-card';

export const SponsorshipTierView = () => {
  const session = useSession();

  const sponsorshipTierQuery = useQuery({
    queryKey: [QUERY_KEYS.SPONSORSHIP_TIERS],
    queryFn: () => apiClient.getUserSponsorshipTiers().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const sponsorships = sponsorshipTierQuery.data?.data || [];
  const sponsorshipsCount = sponsorshipTierQuery.data?.results || 0;

  return (
    <div className="flex flex-col">
      {sponsorshipTierQuery.isLoading ? (
        <LoadingSpinner />
      ) : sponsorshipsCount ? (
        <div className="mt-4">
          {sponsorships.map((tier, key) => (
            <SponsorshipTierManageCard
              key={key}
              id={tier.id}
              price={tier.price}
              description={tier.description}
              isAvailable={tier.isAvailable}
              membersCount={tier.membersCount}
            />
          ))}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};
