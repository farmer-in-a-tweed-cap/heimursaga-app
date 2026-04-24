'use client';

import { useAuth } from '@/app/context/AuthContext';

export function useProFeatures() {
  const { user, isLoading } = useAuth();

  // Explorer Pro is determined by role === 'creator'
  // This aligns with backend CreatorRoleGuard which checks UserRole.CREATOR
  const isPro = user?.role === 'creator';
  const isGuide = user?.isGuide === true;

  return {
    isPro,
    isGuide,
    isLoading, // Expose loading state for components that need to wait
    canReceiveSponsorships: isPro,
    canAccessAdvancedAnalytics: isPro,
    canUseCustomDomain: isPro,
    canExportData: isPro,
    canScheduleEntries: isPro,
    canAccessPrioritySupport: isPro,
    canUseAdvancedMapFeatures: isPro,
    canUseExpeditionBuilder: isPro || isGuide,
    canCreateUnlimitedExpeditions: isPro || isGuide,
    canCreateBlueprints: isGuide,
    canCreateEntries: !!user,
    canAdoptBlueprints: !!user,
    maxExpeditions: isPro || isGuide ? Infinity : 3,
    maxPhotosPerEntry: isPro ? 10 : 2,
    canUseCustomThemes: isPro,
  };
}
