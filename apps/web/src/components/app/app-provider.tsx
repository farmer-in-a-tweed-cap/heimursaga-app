'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, createContext, useState } from 'react';

import { ModalProvider } from '@/components';

export interface IAppContextState {
  mapbox?: {
    token: string;
  };
}

export const AppContext = createContext<IAppContextState>({});

export function AppProvider({
  state,
  children,
}: {
  state: IAppContextState;
  children: ReactNode;
}) {
  // set react-query client
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      }),
  );

  return (
    <AppContext.Provider value={state}>
      <QueryClientProvider client={queryClient}>
        <ModalProvider>{children}</ModalProvider>
      </QueryClientProvider>
    </AppContext.Provider>
  );
}
