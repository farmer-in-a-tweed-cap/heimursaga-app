'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { SponsorshipTierCard } from '@/components';

type Props = {
  username: string;
};

export const UserMemberships: React.FC<Props> = ({ username }) => {
  const membershipQuery = useQuery({
    queryKey: [QUERY_KEYS.MEMBERSHIPS, username],
    queryFn: () =>
      apiClient
        .getSponsorshipTiersByUsername({ username })
        .then(({ data }) => data?.data),
    retry: 0,
    enabled: !!username,
  });

  const loading = membershipQuery.isLoading;
  const memberships = membershipQuery?.data || [];

  return loading ? (
    <LoadingSpinner />
  ) : memberships.length >= 1 ? (
    <div className="w-full flex flex-col gap-2">
      {memberships.map((membership, key) => (
        <SponsorshipTierCard key={key} {...membership} username={username} />
      ))}
    </div>
  ) : (
    <></>
  );
};
