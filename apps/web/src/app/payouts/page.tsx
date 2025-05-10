import { Metadata } from 'next';

import { PageHeaderTitle, UserPayoutBalance } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payouts',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Payouts</PageHeaderTitle>
        <UserPayoutBalance />
      </div>
    </AppLayout>
  );
}
