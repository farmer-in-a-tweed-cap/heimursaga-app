import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PostFeed } from '@/components';
import { AppLayout } from '@/layouts';

export default async function App() {
  const cookie = cookies().toString();

  const postQuery = await apiClient.getPosts({}, { cookie });
  const posts = postQuery.data ? postQuery.data.data : [];

  return (
    <AppLayout>
      <main className="flex flex-col justify-center items-center gap-2 w-full max-w-3xl px-4 lg:px-0">
        <PostFeed loading={false} posts={posts} />
      </main>
    </AppLayout>
  );
}
