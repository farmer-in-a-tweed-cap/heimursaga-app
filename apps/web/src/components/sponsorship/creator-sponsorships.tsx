'use client';

import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { SponsorshipsTable } from './sponsorships-table';

export const CreatorSponsorships = () => {
  const session = useSession();

  const sponsorshipQuery = useQuery({
    queryKey: [API_QUERY_KEYS.CREATOR_SPONSORSHIPS],
    queryFn: () => apiClient.getCreatorSponsorships().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  return (
    <div className="flex flex-col">
      <SponsorshipsTable
        context="creator"
        data={sponsorshipQuery.data?.data || []}
        results={sponsorshipQuery.data?.results || 0}
        refetch={() => sponsorshipQuery.refetch()}
        loading={sponsorshipQuery.isLoading}
      />
    </div>
  );
};
