import Link from 'next/link';
import { Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

interface ProUpgradePromptProps {
  featureName: string;
  featureDescription: string;
  size?: 'small' | 'medium' | 'large';
  showBenefits?: boolean;
}

export function ProUpgradePrompt({
  featureName,
  featureDescription,
  size = 'medium',
  showBenefits = true,
}: ProUpgradePromptProps) {
  const benefits = [
    'Receive sponsorships from other explorers',
    'Advanced analytics and insights',
    'Unlimited expeditions and entries',
    'Priority support and feature requests',
    'Custom domain and branding',
    'Export all your data',
    'Schedule entries in advance',
    'Advanced map features and integrations',
  ];

  if (size === 'small') {
    return (
      <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#ac6d46] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
              {featureName}
            </div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
              {featureDescription}
            </div>
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-xs font-bold"
            >
              UPGRADE TO PRO
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (size === 'large') {
    return (
      <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46]">
        <div className="bg-[#ac6d46] text-white px-6 py-4 flex items-center gap-3">
          <Lock className="w-8 h-8" />
          <div>
            <div className="text-xl font-bold">EXPLORER PRO REQUIRED</div>
            <div className="text-sm opacity-90 mt-1">{featureName}</div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">FEATURE DESCRIPTION:</div>
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  {featureDescription}
                </div>
              </div>
            </div>
          </div>

          {showBenefits && (
            <div>
              <div className="text-sm font-bold mb-3 dark:text-[#e5e5e5]">
                EXPLORER PRO BENEFITS:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                    <span className="text-[#616161] dark:text-[#b5bcc4]">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#ac6d46] p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                  $9.99/month or $99/year
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Save 17% with annual billing • Cancel anytime
                </div>
              </div>
              <Link
                href="/settings/billing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-sm font-bold whitespace-nowrap"
              >
                <Lock className="w-4 h-4" />
                UPGRADE TO PRO
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#616161] dark:text-[#b5bcc4] border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">TRANSPARENCY NOTE:</div>
              <div>
                Explorer Pro subscriptions help us maintain and improve the platform. Basic Explorer accounts remain free forever and can send sponsorships. Only Pro accounts can receive sponsorships and access advanced features.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Medium size (default)
  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46]">
      <div className="bg-[#ac6d46] text-white px-4 py-3 flex items-center gap-3">
        <Lock className="w-6 h-6" />
        <div className="font-bold">{featureName} - EXPLORER PRO ONLY</div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
            {featureDescription}
          </div>
        </div>

        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] p-4">
          <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">UPGRADE TO ACCESS:</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
            <div>• Receive sponsorships from other explorers</div>
            <div>• Unlimited expeditions and advanced analytics</div>
            <div>• Priority support and all Pro features</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">$9.99/mo</span> or $99/year
          </div>
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-sm font-bold"
          >
            <Lock className="w-4 h-4" />
            UPGRADE NOW
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}