'use client';

import { ReactNode, createContext, useState } from 'react';

import { ISessionUser } from '@/types';

interface SessionContextType {
  session: ISessionUser | null;
}

export const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

export function SessionProvider({
  state,
  children,
}: {
  state: ISessionUser | null;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ session: state }}>
      {children}
    </SessionContext.Provider>
  );
}
