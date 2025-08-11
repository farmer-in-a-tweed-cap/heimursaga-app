import { MapLayout } from '@/layouts';

import { MapExploreView } from '@/components';

// Ensure explore page shows fresh content after user actions
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  return (
    <MapLayout secure={false}>
      <MapExploreView />
    </MapLayout>
  );
}
