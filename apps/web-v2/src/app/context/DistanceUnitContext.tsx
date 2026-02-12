'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type DistanceUnit = 'km' | 'mi';

const KM_TO_MI = 0.621371;

interface DistanceUnitContextType {
  unit: DistanceUnit;
  setUnit: (unit: DistanceUnit) => void;
  formatDistance: (km: number, decimals?: number) => string;
  formatSpeed: (kmh: number) => string;
  distanceLabel: string;
  speedLabel: string;
}

const DistanceUnitContext = createContext<DistanceUnitContextType | undefined>(undefined);

export function DistanceUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<DistanceUnit>(() => {
    if (typeof window === 'undefined') return 'km';
    const saved = localStorage.getItem('heimursaga-distance-unit');
    if (saved === 'km' || saved === 'mi') return saved;
    return 'km';
  });

  useEffect(() => {
    localStorage.setItem('heimursaga-distance-unit', unit);
  }, [unit]);

  const setUnit = (newUnit: DistanceUnit) => {
    setUnitState(newUnit);
  };

  const formatDistance = useCallback((km: number, decimals: number = 1): string => {
    if (unit === 'mi') {
      return `${(km * KM_TO_MI).toFixed(decimals)} mi`;
    }
    return `${km.toFixed(decimals)} km`;
  }, [unit]);

  const formatSpeed = useCallback((kmh: number): string => {
    if (unit === 'mi') {
      return `${(kmh * KM_TO_MI).toFixed(1)} mph`;
    }
    return `${kmh.toFixed(1)} km/h`;
  }, [unit]);

  const distanceLabel = unit === 'mi' ? 'mi' : 'km';
  const speedLabel = unit === 'mi' ? 'mph' : 'km/h';

  return (
    <DistanceUnitContext.Provider value={{ unit, setUnit, formatDistance, formatSpeed, distanceLabel, speedLabel }}>
      {children}
    </DistanceUnitContext.Provider>
  );
}

export function useDistanceUnit() {
  const context = useContext(DistanceUnitContext);
  if (context === undefined) {
    throw new Error('useDistanceUnit must be used within a DistanceUnitProvider');
  }
  return context;
}
