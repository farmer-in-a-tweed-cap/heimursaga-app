'use client';

import { useContext, useRef } from 'react';

import { AppContext } from '@/components';

export const useMapbox = () => {
  const { context } = useContext(AppContext);
  const ref = useRef<mapboxgl.Map | null>(null);

  return {
    token: context.config.mapbox?.token,
    ref,
  };
};
