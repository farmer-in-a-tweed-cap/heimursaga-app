import { PageNotFound } from '@/components';

import { AppLayout } from '@/layouts';

export default async function Page() {
  return (
    <AppLayout>
      <PageNotFound />
    </AppLayout>
  );
}
