import { Metadata } from 'next';

import { AppMapLayout } from '@/app/layout';

import { TripCreateView } from '@/components';

export const metadata: Metadata = {
  title: 'Edit trip',
};

export default async function Page() {
  return (
    <AppMapLayout>
      <TripCreateView />
    </AppMapLayout>
  );
}
