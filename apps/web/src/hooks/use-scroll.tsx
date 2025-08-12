'use client';

import { useCallback, useRef } from 'react';

interface ScrollOptions extends ScrollIntoViewOptions {
  behavior?: 'auto' | 'smooth';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
}

export const useScroll = () => {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const setRef = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      refs.current[key] = element;
    },
    [],
  );

  const scrollTo = useCallback(
    (
      key: string,
      options: ScrollOptions = { behavior: 'smooth', block: 'start' },
    ) => {
      const element = refs.current[key];
      if (!element) {
        return;
      }
      try {
        element.scrollIntoView(options);
      } catch (error) {
        console.error(`failed to scroll to element with key: ${key}`, error);
      }
    },
    [],
  );

  return { setRef, scrollTo };
};
