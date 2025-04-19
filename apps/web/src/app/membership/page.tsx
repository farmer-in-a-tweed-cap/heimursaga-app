import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { MembershipManageCard } from '@/components/membership';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookie = cookies().toString();

  const membershipTierQuery = await apiClient.getUserMembershipTiers({
    cookie,
  });
  const membershipTier = membershipTierQuery.data?.data?.[0];

  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <PageHeaderTitle>Membership</PageHeaderTitle>
        <div className="mt-4">
          {membershipTier && (
            <MembershipManageCard
              id={membershipTier.id}
              price={membershipTier.price}
              description={membershipTier.description}
              membersCount={membershipTier.membersCount}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
