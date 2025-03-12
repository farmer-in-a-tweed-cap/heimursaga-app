import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { cookies } from 'next/headers';

import {
  ISessionUserQueryResponse,
  getSessionUserSSRQuery,
} from '@/lib/actions';

import { AppLayout } from '@/components';

export default async function App() {
  const cookie = cookies().toString();

  const client = new QueryClient();

  const state = dehydrate(client);

  await client.prefetchQuery({
    queryKey: getSessionUserSSRQuery.queryKey,
    queryFn: () => getSessionUserSSRQuery.queryFn({ cookie }),
  });

  const user = client.getQueryData<ISessionUserQueryResponse>(
    getSessionUserSSRQuery.queryKey,
  );

  return (
    <AppLayout>
      <HydrationBoundary state={state}>
        <main className="flex flex-col justify-center items-center gap-4 w-full max-w-l">
          <div className="w-[500px] p-4 whitespace-pre-line break-words text-xs">
            {JSON.stringify({ user })}
          </div>
          {/* {user && (
            <div>
              <LogoutButton />
            </div>
          )} */}
        </main>
      </HydrationBoundary>
    </AppLayout>
  );
}
