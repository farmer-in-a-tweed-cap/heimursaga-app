import { Metadata } from 'next';

import { ExploreMap } from '@/components';

import { AppMapLayout } from './layout';

export const metadata: Metadata = {
  title: 'Home',
};

export default async function Page() {
  return (
    <AppMapLayout secure={false}>
      <div className="w-full h-full flex flex-col justify-start items-center">
        <ExploreMap />
      </div>
    </AppMapLayout>
  );
}
