import { Metadata } from 'next';

import { ExploreMap } from '@/components';

export const metadata: Metadata = {
  title: 'Explore',
};

export default async function Page() {
  return (
    <div className="w-full h-full flex flex-col justify-start items-center">
      <ExploreMap />
    </div>
  );
}
