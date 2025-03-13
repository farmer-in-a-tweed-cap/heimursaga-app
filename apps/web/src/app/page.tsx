import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { cookies } from 'next/headers';

import { ISessionUserQueryResponse, QUERY_KEYS, apiClient } from '@/lib/api';

import { LogoutButton } from '@/components/button';

import { AppLayout } from '@/components';

export default async function App() {
  const cookie = cookies().toString();

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.GET_SESSION],
    queryFn: () => apiClient.getSession({ cookie }),
  });

  const state = dehydrate(queryClient);

  const session = queryClient.getQueryData<ISessionUserQueryResponse>([
    QUERY_KEYS.GET_SESSION,
  ]);

  return (
    <AppLayout>
      <HydrationBoundary state={state}>
        <main className="flex flex-col justify-center items-center gap-4 w-full max-w-l">
          <div className="w-[500px] p-4 whitespace-pre-line break-words text-xs">
            {JSON.stringify({ session })}
          </div>
          {session && (
            <div>
              <LogoutButton />
            </div>
          )}
        </main>{' '}
      </HydrationBoundary>
    </AppLayout>
  );
}
