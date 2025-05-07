import { Metadata } from 'next';

import { AppMapLayout } from '@/app/layout';

import { TripCreateView } from '@/components';

export const metadata: Metadata = {
  title: 'Create trip',
};

export default async function Page() {
  return (
    <AppMapLayout>
      <TripCreateView />
    </AppMapLayout>
  );
}
