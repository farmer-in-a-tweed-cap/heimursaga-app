'use client';

import { useAuth } from '@/app/context/AuthContext';

// Every account gets every feature. The Guide role adds guide-only tools
// (blueprints, route file import/export, reviews).
export function useExplorerFeatures() {
  const { user, isLoading } = useAuth();
  const isGuide = user?.isGuide === true;

  return {
    isGuide,
    isLoading,
    canCreateBlueprints: isGuide,
    canAdoptBlueprints: !!user,
  };
}
