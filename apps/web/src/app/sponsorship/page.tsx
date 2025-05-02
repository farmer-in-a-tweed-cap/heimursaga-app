import { Metadata } from 'next';

import { SponsorshipView } from '@/components';
import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sponsorship',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col">
        <PageHeaderTitle>Sponsorship</PageHeaderTitle>
        <div className="flex flex-col mt-6">
          <SponsorshipView />
        </div>
      </div>
    </AppLayout>
  );
}
