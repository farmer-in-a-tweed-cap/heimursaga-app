import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageHeaderTitle, UserBookmarks } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bookmarks',
};

export default async function Page() {
  const cookie = cookies().toString();

  const postQuery = await apiClient.getPosts({}, { cookie });

  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <PageHeaderTitle>Bookmarks</PageHeaderTitle>
        <div className="mt-4">
          <UserBookmarks />
        </div>
      </div>
    </AppLayout>
  );
}
