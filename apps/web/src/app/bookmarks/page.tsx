import { Metadata } from 'next';

import { PageHeaderTitle, UserBookmarks } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bookmarks',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Bookmarks</PageHeaderTitle>
        <UserBookmarks />
      </div>
    </AppLayout>
  );
}
