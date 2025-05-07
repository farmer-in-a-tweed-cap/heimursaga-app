import { Button } from '@repo/ui/components';
import { Metadata } from 'next';
import Link from 'next/link';

import { CreatorTrips, PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';
import { ROUTER } from '@/router';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trips',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="w-full flex flex-row items-end justify-between">
          <PageHeaderTitle>Trips</PageHeaderTitle>
          <div>
            <Button asChild>
              <Link href={ROUTER.TRIPS.CREATE}>Create</Link>
            </Button>
          </div>
        </div>
        <CreatorTrips />
      </div>
    </AppLayout>
  );
}
