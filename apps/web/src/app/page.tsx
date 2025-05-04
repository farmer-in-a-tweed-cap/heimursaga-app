import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageHeaderTitle, PostFeed } from '@/components';

import { AppLayout } from './layout';

export default async function App() {
  const cookie = cookies().toString();

  const postQuery = await apiClient.getPosts({}, { cookie });
  const posts = postQuery.data ? postQuery.data.data : [];

  return (
    <AppLayout secure={false}>
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <PageHeaderTitle>Home</PageHeaderTitle>
        <div className="mt-4">
          <PostFeed loading={false} posts={posts} />
        </div>
      </div>
    </AppLayout>
  );
}
