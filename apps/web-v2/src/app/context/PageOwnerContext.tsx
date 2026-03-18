'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface PageOwnerContextValue {
  /** True when the currently viewed page content belongs to the logged-in user */
  isOwnContent: boolean;
  setIsOwnContent: (value: boolean) => void;
}

const PageOwnerContext = createContext<PageOwnerContextValue>({
  isOwnContent: false,
  setIsOwnContent: () => {},
});

export function PageOwnerProvider({ children }: { children: React.ReactNode }) {
  const [isOwnContent, setIsOwnContentRaw] = useState(false);
  const setIsOwnContent = useCallback((value: boolean) => setIsOwnContentRaw(value), []);

  return (
    <PageOwnerContext.Provider value={{ isOwnContent, setIsOwnContent }}>
      {children}
    </PageOwnerContext.Provider>
  );
}

export function usePageOwner() {
  return useContext(PageOwnerContext);
}
