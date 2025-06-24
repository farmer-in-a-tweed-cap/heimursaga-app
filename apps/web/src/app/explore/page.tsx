import { MapLayout } from '../layout';

import { MapExploreView } from '@/components';

export default async function Page() {
  return (
    <MapLayout secure={false}>
      <MapExploreView />
    </MapLayout>
  );
}
