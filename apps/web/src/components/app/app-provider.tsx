'use client';

import { ToastProvider } from '@repo/ui/components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, createContext, useState } from 'react';

import { ModalProvider } from '@/components';
import { TOAST_DURATION } from '@/constants';

export interface IAppContext {
  context: IAppContextState;
  setContext?: (context: Partial<IAppContextState>) => void;
}

export interface IAppContextState {
  config: IAppContextStateConfig;
  app: {
    drawer: boolean;
  };
}

export interface IAppContextStateConfig {
  mapbox?: {
    token: string;
  };
}

export const AppContext = createContext<IAppContext>({
  context: { config: {}, app: { drawer: false } },
  setContext: () => {},
});

export function AppProvider({
  config,
  children,
}: {
  config: IAppContextStateConfig;
  children: ReactNode;
}) {
  const [state, setState] = useState<IAppContextState>({
    config,
    app: { drawer: false },
  });

  const setContext = (data: Partial<IAppContextState>) => {
    setState((prev) => ({ ...prev, ...data }));
  };

  const context: IAppContext = {
    context: state,
    setContext,
  };

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
    <AppContext.Provider value={context}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider
          theme="light"
          expand={false}
          position="bottom-right"
          duration={TOAST_DURATION}
          visibleToasts={1}
          closeButton={false}
        />
        <ModalProvider>{children}</ModalProvider>
      </QueryClientProvider>
    </AppContext.Provider>
  );
}
