/**
 * This is an example page demonstrating how to use Pro feature gating throughout the app.
 * This file should be used as a reference and can be deleted once implemented elsewhere.
 */

import { useProFeatures } from '@/app/hooks/useProFeatures';
import { ProFeatureGate } from '@/app/components/ProFeatureGate';
import { ProBadge } from '@/app/components/ProBadge';
import { ProUpgradePrompt } from '@/app/components/ProUpgradePrompt';
import { BarChart3, Download, Calendar, Lock } from 'lucide-react';

export function ProFeaturesExamplePage() {
  const { isPro, canReceiveSponsorships, maxExpeditions, maxPhotosPerEntry } = useProFeatures();

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5] mb-2">
              PRO FEATURES IMPLEMENTATION EXAMPLES
            </h1>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
              Reference guide for implementing Pro feature gating throughout the application
            </p>
          </div>
          {isPro && <ProBadge size="large" variant="badge" />}
        </div>
      </div>

      <div className="space-y-6">
        {/* Example 1: Using the hook directly */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
            EXAMPLE 1: DIRECT HOOK USAGE
          </div>
          <div className="p-6">
            <div className="text-sm mb-4 dark:text-[#e5e5e5]">
              Use the <code className="bg-[#f5f5f5] dark:bg-[#3a3a3a] px-2 py-1 font-mono text-xs">useProFeatures()</code> hook directly in your components:
            </div>
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 font-mono text-xs space-y-2">
              <div className="text-[#616161] dark:text-[#b5bcc4]">const &#123; isPro, canReceiveSponsorships, maxExpeditions &#125; = useProFeatures();</div>
              <div className="mt-4">
                <div className="font-bold mb-2 dark:text-[#e5e5e5]">Current Status:</div>
                <div className="text-[#616161] dark:text-[#b5bcc4] space-y-1">
                  <div>• isPro: {isPro ? 'true' : 'false'}</div>
                  <div>• canReceiveSponsorships: {canReceiveSponsorships ? 'true' : 'false'}</div>
                  <div>• maxExpeditions: {maxExpeditions === Infinity ? 'Unlimited' : maxExpeditions}</div>
                  <div>• maxPhotosPerEntry: {maxPhotosPerEntry}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example 2: ProFeatureGate with 'replace' mode */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
            EXAMPLE 2: ProFeatureGate - REPLACE MODE (DEFAULT)
          </div>
          <div className="p-6">
            <div className="text-sm mb-4 dark:text-[#e5e5e5]">
              Replaces the feature with an upgrade prompt for non-Pro users:
            </div>
            <ProFeatureGate
              featureName="Advanced Analytics Dashboard"
              featureDescription="Access detailed analytics about your journal performance, reader engagement, sponsorship trends, and expedition insights. Track your growth over time with interactive charts and export reports."
              mode="replace"
            >
              <div className="bg-[#4676ac] text-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6" />
                  <div className="text-lg font-bold">ADVANCED ANALYTICS DASHBOARD</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/10 p-4">
                    <div className="text-2xl font-bold">2,847</div>
                    <div className="text-xs opacity-75">Total Views</div>
                  </div>
                  <div className="bg-white/10 p-4">
                    <div className="text-2xl font-bold">$1,420</div>
                    <div className="text-xs opacity-75">Avg Monthly</div>
                  </div>
                  <div className="bg-white/10 p-4">
                    <div className="text-2xl font-bold">94%</div>
                    <div className="text-xs opacity-75">Engagement</div>
                  </div>
                </div>
              </div>
            </ProFeatureGate>
          </div>
        </div>

        {/* Example 3: ProFeatureGate with 'disable' mode */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
            EXAMPLE 3: ProFeatureGate - DISABLE MODE
          </div>
          <div className="p-6">
            <div className="text-sm mb-4 dark:text-[#e5e5e5]">
              Shows the feature but makes it non-interactive with an overlay:
            </div>
            <ProFeatureGate
              featureName="Data Export"
              featureDescription="Export all your journal entries, expedition data, and media files in multiple formats (JSON, CSV, PDF). Perfect for backups or using your data elsewhere."
              mode="disable"
            >
              <div className="border-2 border-[#202020] dark:border-[#616161] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Download className="w-6 h-6 text-[#4676ac]" />
                  <div className="text-lg font-bold dark:text-[#e5e5e5]">EXPORT YOUR DATA</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="px-4 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#95a2aa] transition-all">
                    EXPORT JSON
                  </button>
                  <button className="px-4 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#95a2aa] transition-all">
                    EXPORT CSV
                  </button>
                  <button className="px-4 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#95a2aa] transition-all">
                    EXPORT PDF
                  </button>
                </div>
              </div>
            </ProFeatureGate>
          </div>
        </div>

        {/* Example 4: ProFeatureGate with 'hide' mode */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
            EXAMPLE 4: ProFeatureGate - HIDE MODE
          </div>
          <div className="p-6">
            <div className="text-sm mb-4 dark:text-[#e5e5e5]">
              Completely hides the feature for non-Pro users:
            </div>
            <div className="space-y-4">
              <button className="px-4 py-3 bg-[#4676ac] text-white font-bold text-sm w-full">
                VISIBLE TO ALL USERS
              </button>
              
              <ProFeatureGate
                featureName="Schedule Entries"
                featureDescription="Schedule your journal entries to be published at a future date and time. Perfect for maintaining a consistent posting schedule while on remote expeditions."
                mode="hide"
              >
                <button className="px-4 py-3 bg-[#ac6d46] text-white font-bold text-sm w-full flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <Lock className="w-4 h-4" />
                  SCHEDULE ENTRY (PRO ONLY - HIDDEN FOR BASIC)
                </button>
              </ProFeatureGate>
              
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                {isPro 
                  ? '✓ You should see the schedule button above'
                  : '✗ The schedule button is hidden for basic users'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Example 5: Standalone upgrade prompts */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
            EXAMPLE 5: STANDALONE UPGRADE PROMPTS
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="text-sm mb-3 font-bold dark:text-[#e5e5e5]">Small Size:</div>
              <ProUpgradePrompt
                featureName="Priority Support"
                featureDescription="Get priority email support with guaranteed 24-hour response times."
                size="small"
                showBenefits={false}
              />
            </div>
            
            <div>
              <div className="text-sm mb-3 font-bold dark:text-[#e5e5e5]">Medium Size (Default):</div>
              <ProUpgradePrompt
                featureName="Custom Domain"
                featureDescription="Use your own domain name for your journal (e.g., journal.yourname.com) instead of the default heimursaga.com subdomain."
                size="medium"
                showBenefits={false}
              />
            </div>
          </div>
        </div>

        {/* Example 6: Pro badges */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
            EXAMPLE 6: PRO BADGES
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm dark:text-[#e5e5e5]">Small Badge:</span>
              <ProBadge size="small" variant="badge" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm dark:text-[#e5e5e5]">Medium Badge:</span>
              <ProBadge size="medium" variant="badge" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm dark:text-[#e5e5e5]">Large Badge:</span>
              <ProBadge size="large" variant="badge" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm dark:text-[#e5e5e5]">Tag Variant:</span>
              <ProBadge size="medium" variant="tag" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm dark:text-[#e5e5e5]">Inline Variant:</span>
              <div className="text-sm dark:text-[#e5e5e5]">
                Sarah C. <ProBadge size="small" variant="inline" />
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Code Examples */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#ac6d46] text-white px-4 py-2 font-bold text-sm">
            IMPLEMENTATION CODE EXAMPLES
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">1. Protecting an entire page:</div>
              <pre className="bg-[#202020] text-[#b5bcc4] p-4 text-xs overflow-x-auto font-mono">
{`import { ProRoute } from '@/app/components/ProRoute';

export function AnalyticsPage() {
  return (
    <ProRoute
      pageName="Analytics Dashboard"
      pageDescription="Full analytics page description..."
    >
      {/* Your page content */}
    </ProRoute>
  );
}`}
              </pre>
            </div>

            <div>
              <div className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">2. Protecting a feature within a page:</div>
              <pre className="bg-[#202020] text-[#b5bcc4] p-4 text-xs overflow-x-auto font-mono">
{`import { ProFeatureGate } from '@/app/components/ProFeatureGate';

<ProFeatureGate
  featureName="Feature Name"
  featureDescription="Why users need Pro for this..."
  mode="replace" // or "disable" or "hide"
>
  {/* Your Pro feature content */}
</ProFeatureGate>`}
              </pre>
            </div>

            <div>
              <div className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">3. Conditional rendering with hook:</div>
              <pre className="bg-[#202020] text-[#b5bcc4] p-4 text-xs overflow-x-auto font-mono">
{`import { useProFeatures } from '@/app/hooks/useProFeatures';

const { isPro, canReceiveSponsorships } = useProFeatures();

{isPro && (
  <button>Pro Only Feature</button>
)}

{!canReceiveSponsorships && (
  <ProUpgradePrompt ... />
)}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}