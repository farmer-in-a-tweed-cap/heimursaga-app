'use client';

import { useContext } from 'react';

import { SessionContext } from '@/contexts';

export const useSession = () => {
  const context = useContext(SessionContext);

  const session = context?.session;
  const logged = !!session;

  return { ...session, logged };
};
