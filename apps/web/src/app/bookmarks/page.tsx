import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageHeaderTitle, PostFeed, UserBookmarksFeed } from '@/components';
import { AppLayout } from '@/layouts';

export default async function App() {
  const cookie = cookies().toString();

  const postQuery = await apiClient.getPosts({}, { cookie });
  const posts = postQuery.data ? postQuery.data.data : [];

  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <PageHeaderTitle>Bookmarks</PageHeaderTitle>
        <div className="mt-4">
          <UserBookmarksFeed />
        </div>
      </div>
    </AppLayout>
  );
}
