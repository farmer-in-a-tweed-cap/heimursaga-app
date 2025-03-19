'use client';

import { useContext, useRef } from 'react';

import { AppContext } from '@/contexts';

export const useMapbox = () => {
  const { mapbox } = useContext(AppContext);
  const ref = useRef<mapboxgl.Map | null>(null);

  return {
    token: mapbox?.token,
    ref,
  };
};
