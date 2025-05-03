'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { CreatorSponsorshipCard } from './creator-sponsorship-card';

export const CreatorSponsorships = () => {
  const session = useSession();

  const sponsorshipQuery = useQuery({
    queryKey: [QUERY_KEYS.SPONSORSHIPS],
    queryFn: () => apiClient.getCreatorSponsorships().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const sponsorships = sponsorshipQuery.data?.data || [];
  const sponsorshipResults = sponsorshipQuery.data?.results || 0;

  return (
    <div className="flex flex-col">
      {sponsorshipQuery.isLoading ? (
        <LoadingSpinner />
      ) : sponsorshipResults >= 1 ? (
        <div className="mt-4 flex flex-col">
          <span className="text-lg font-medium">
            {sponsorshipResults} sponsors
          </span>
          <div className="mt-2 flex flex-col gap-4">
            {sponsorships.map(({ id, amount, currency, type, user }, key) => (
              <CreatorSponsorshipCard
                key={key}
                {...{ id, type, amount, currency, user }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <span>no sponsors yet</span>
        </div>
      )}
    </div>
  );
};
