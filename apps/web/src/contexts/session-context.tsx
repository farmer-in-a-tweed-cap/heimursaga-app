'use client';

import { ISessionUser } from '@repo/types';
import { ReactNode, createContext } from 'react';

interface SessionContextType {
  session?: ISessionUser;
}

export const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

export function SessionProvider({
  state,
  children,
}: {
  state?: ISessionUser;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ session: state }}>
      {children}
    </SessionContext.Provider>
  );
}
