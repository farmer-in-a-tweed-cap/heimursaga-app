'use client';

import { ReactNode, createContext } from 'react';

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
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
