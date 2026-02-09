'use client';

import { ReactNode } from 'react';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { ProUpgradePrompt } from '@/app/components/ProUpgradePrompt';
import { Loader2 } from 'lucide-react';

interface ProRouteProps {
  children: ReactNode;
  pageName: string;
  pageDescription: string;
}

export function ProRoute({ children, pageName, pageDescription }: ProRouteProps) {
  const { isPro, isLoading } = useProFeatures();

  // Show loading state while checking auth/pro status
  // This prevents briefly showing the upgrade prompt before auth check completes
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#616161] dark:text-[#b5bcc4] mb-4" />
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
              Verifying access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <ProUpgradePrompt
          featureName={pageName}
          featureDescription={pageDescription}
          size="large"
          showBenefits={true}
        />
      </div>
    );
  }

  return <>{children}</>;
}
