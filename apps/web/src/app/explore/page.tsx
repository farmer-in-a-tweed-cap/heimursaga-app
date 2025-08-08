import { MapLayout } from '@/layouts';

import { MapExploreView } from '@/components';

export default async function Page() {
  return (
    <MapLayout secure={false}>
      <MapExploreView />
    </MapLayout>
  );
}
