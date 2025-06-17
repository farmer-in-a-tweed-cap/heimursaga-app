import { Metadata } from 'next';

import { MapLayout } from '@/app/layout';

import { TripCreateView } from '@/components';

export const metadata: Metadata = {
  title: 'Create a journey',
};

export default async function Page() {
  return (
    <MapLayout>
      <TripCreateView />
    </MapLayout>
  );
}
