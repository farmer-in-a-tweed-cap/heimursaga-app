import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageHeaderTitle, PostFeed } from '@/components';
import { AppLayout } from '@/layouts';

export default async function App() {
  const cookie = cookies().toString();

  const postQuery = await apiClient.getPosts({}, { cookie });
  const posts = postQuery.data ? postQuery.data.data : [];

  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <PageHeaderTitle>Feed</PageHeaderTitle>
        <div className="mt-4">
          <PostFeed loading={false} posts={posts} />
        </div>
      </div>
    </AppLayout>
  );
}
