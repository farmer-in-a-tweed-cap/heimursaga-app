import { MapExploreView } from '@/components';

import { MapLayout } from './layout';
import { metadata as _metadata } from './layout';

export default async function Page() {
  return (
    <MapLayout secure={false}>
      <MapExploreView />
    </MapLayout>
  );
}
