'use client';

import { useEffect, useState } from 'react';

interface IUseScreenState {
  width: number;
  height: number;
  mobile: boolean;
  desktop: boolean;
}

const BREAKPOINTS = {
  MOBILE: 760,
  DESKTOP: 1140,
};

export const useScreen = () => {
  const [state, setState] = useState<IUseScreenState>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    mobile:
      typeof window !== 'undefined'
        ? window.innerWidth > 0 && window.innerWidth < BREAKPOINTS.DESKTOP
        : false,
    desktop:
      typeof window !== 'undefined'
        ? window.innerWidth > BREAKPOINTS.MOBILE &&
          window.innerWidth >= BREAKPOINTS.DESKTOP
        : false,
  });

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const desktop =
      window.innerWidth > BREAKPOINTS.MOBILE &&
      window.innerWidth >= BREAKPOINTS.DESKTOP;
    const mobile =
      window.innerWidth > 0 && window.innerWidth < BREAKPOINTS.DESKTOP;

    setState((state) => ({ ...state, width, height, desktop, mobile }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    resize();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return { ...state, resize };
};
