import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';

import { QUERY_KEYS, fetchPosts } from '@/lib/api';

import { AppLayout } from '@/components';

export default async function App() {
  const client = new QueryClient();

  await client.prefetchQuery({
    queryKey: [QUERY_KEYS.POSTS],
    queryFn: fetchPosts,
  });

  const dehydratedState = dehydrate(client);

  return (
    <AppLayout>
      <HydrationBoundary state={dehydratedState}>
        <main className="flex flex-col justify-center items-center gap-4 w-full max-w-l">
          {JSON.stringify({ state: dehydratedState })}
        </main>
      </HydrationBoundary>
    </AppLayout>
  );
}
