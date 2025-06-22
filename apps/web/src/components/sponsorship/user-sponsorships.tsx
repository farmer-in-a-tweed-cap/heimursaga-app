'use client';

import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { SponsorshipsTable } from './sponsorships-table';

export const UserSponsorships = () => {
  const session = useSession();

  const sponsorshipQuery = useQuery({
    queryKey: [API_QUERY_KEYS.SPONSORSHIPS],
    queryFn: () => apiClient.getUserSponsorships().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const sponsorships = sponsorshipQuery.data?.data || [];

  return (
    <div className="flex flex-col">
      <SponsorshipsTable
        context="user"
        data={sponsorships}
        refetch={() => sponsorshipQuery.refetch()}
        loading={sponsorshipQuery.isLoading}
      />
    </div>
  );
};
