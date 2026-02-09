'use client';

import { useAuth } from '@/app/context/AuthContext';

export function useProFeatures() {
  const { user, isLoading } = useAuth();

  // Explorer Pro is determined by role === 'creator'
  // This aligns with backend CreatorRoleGuard which checks UserRole.CREATOR
  const isPro = user?.role === 'creator';

  return {
    isPro,
    isLoading, // Expose loading state for components that need to wait
    canReceiveSponsorships: isPro,
    canAccessAdvancedAnalytics: isPro,
    canUseCustomDomain: isPro,
    canExportData: isPro,
    canScheduleEntries: isPro,
    canAccessPrioritySupport: isPro,
    canUseAdvancedMapFeatures: isPro,
    canCreateUnlimitedExpeditions: isPro,
    maxExpeditions: isPro ? Infinity : 3,
    maxPhotosPerEntry: isPro ? 50 : 10,
    canUseCustomThemes: isPro,
  };
}
