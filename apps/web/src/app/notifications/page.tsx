import { Metadata } from 'next';

import { PageHeaderTitle, UserNotifications } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <PageHeaderTitle>Notifications</PageHeaderTitle>
        <UserNotifications />
      </div>
    </AppLayout>
  );
}
