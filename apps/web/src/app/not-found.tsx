import { PageNotFound } from '@/components';

import { AppLayout } from './layout';

export default async function Page() {
  return (
    <AppLayout>
      <PageNotFound />
    </AppLayout>
  );
}
