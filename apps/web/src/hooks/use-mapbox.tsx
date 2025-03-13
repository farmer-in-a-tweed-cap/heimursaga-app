'use client';

import { useContext } from 'react';

import { AppContext } from '@/contexts';

export const useMapbox = () => {
  const { mapbox } = useContext(AppContext);

  return {
    token: mapbox?.token,
  };
};
