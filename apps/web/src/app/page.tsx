import { Metadata } from 'next';

import { MapExploreView } from '@/components';

import { MapLayout } from './layout';

export const metadata: Metadata = {
  title: 'Home',
};

export default async function Page() {
  return (
    <MapLayout secure={false}>
      <MapExploreView />
    </MapLayout>
  );
}
