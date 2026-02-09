'use client';

import { ReactNode } from 'react';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { ProUpgradePrompt } from '@/app/components/ProUpgradePrompt';

interface ProFeatureGateProps {
  children: ReactNode;
  featureName: string;
  featureDescription: string;
  showUpgradePrompt?: boolean;
  fallback?: ReactNode;
  mode?: 'hide' | 'disable' | 'replace';
}

export function ProFeatureGate({
  children,
  featureName,
  featureDescription,
  showUpgradePrompt = true,
  fallback,
  mode = 'replace',
}: ProFeatureGateProps) {
  const { isPro } = useProFeatures();

  // If user is Pro, always show the feature
  if (isPro) {
    return <>{children}</>;
  }

  // If user is not Pro, handle based on mode
  switch (mode) {
    case 'hide':
      return null;
    
    case 'disable':
      return (
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-[#202020]/80 backdrop-blur-sm">
            <div className="bg-[#ac6d46] text-white px-4 py-2 font-bold text-sm border-2 border-white">
              EXPLORER PRO ONLY
            </div>
          </div>
        </div>
      );
    
    case 'replace':
    default:
      if (showUpgradePrompt) {
        return (
          <ProUpgradePrompt
            featureName={featureName}
            featureDescription={featureDescription}
          />
        );
      }
      return fallback || null;
  }
}
