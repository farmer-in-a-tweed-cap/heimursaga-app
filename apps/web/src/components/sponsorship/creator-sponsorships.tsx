'use client';

import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { SponsorshipsTable } from './sponsorships-table';

export const CreatorSponsorships = () => {
  const session = useSession();

  const sponsorshipQuery = useQuery({
    queryKey: [QUERY_KEYS.SPONSORSHIPS],
    queryFn: () => apiClient.getCreatorSponsorships().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const sponsorships = sponsorshipQuery.data?.data || [];

  return (
    <div className="flex flex-col">
      <SponsorshipsTable
        context="creator"
        data={sponsorships}
        refetch={() => sponsorshipQuery.refetch()}
        loading={sponsorshipQuery.isLoading}
      />
    </div>
  );
};
