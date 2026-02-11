'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  Crown, 
  Lock, 
  Shield, 
  Zap,
  Users,
  BarChart3,
  MessageSquare,
  DollarSign,
  Eye,
  HelpCircle,
  FileText,
  Sparkles
} from 'lucide-react';

export function UpgradePage() {
  const { user } = useAuth();
  const { isPro } = useProFeatures();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // ============================================================
  // 🔴 BACKEND API CALL NEEDED
  // ============================================================
  // Endpoint: GET /api/users/me/subscription
  // Description: Fetch current user's subscription status to check if already Pro
  // Triggered: On page load (useEffect)
  // Response should include: { isPro: boolean, plan: string, status: string }
  // Replace isPro check with: const { data: subscription } = await fetchUserSubscription();
  // ============================================================

  // If already Pro, redirect to billing page
  if (isPro) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#ac6d46] text-white px-6 py-4 font-bold text-lg flex items-center gap-2">
            <Crown className="w-6 h-6" />
            ALREADY EXPLORER PRO
          </div>
          <div className="p-8 text-center">
            <div className="text-xl font-bold mb-4 dark:text-[#e5e5e5]">
              You're already enjoying Explorer Pro benefits!
            </div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              Manage your subscription, payment methods, and billing history in your billing settings.
            </div>
            <Link
              href="/settings/billing"
              className="inline-block px-6 py-3 bg-[#4676ac] text-white font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
            >
              GO TO BILLING SETTINGS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Navigate to checkout page with selected plan
    router.push(`/checkout?plan=${billingPeriod}`);
  };

  const monthlyPrice = 7;
  const annualPrice = 50; // 40% off yearly ($84 -> $50)
  const annualSavings = (monthlyPrice * 12) - annualPrice; // $34 savings

  const coreFeatures = [
    { icon: DollarSign, title: 'Receive Sponsorships', desc: 'Accept one-time contributions and monthly subscriptions from supporters who want to fund your expeditions' },
    { icon: MessageSquare, title: 'Private Messages', desc: 'Direct messaging with your sponsors and other explorers for deeper connections and coordination' },
    { icon: FileText, title: 'Additional Entry Types', desc: 'Unlock sponsor-only entries and Expedition Notes (280-char daily updates) to keep supporters engaged' },
    { icon: Sparkles, title: 'More Photos Per Entry', desc: 'Upload up to 10 photos per journal entry instead of the standard 3 for free accounts' },
    { icon: BarChart3, title: 'Expedition Insights', desc: 'Track entry views, engagement metrics, sponsor activity, and understand your audience better' },
    { icon: Eye, title: 'Sponsor-Only Content', desc: 'Create exclusive journal entries and updates visible only to your paying supporters' }
  ];

  const includedFeatures = [
    'Receive one-time and monthly sponsorships',
    'Private messaging with sponsors and explorers',
    'Sponsor-only journal entries',
    'Expedition Notes (280-char daily sponsor updates)',
    'Up to 10 photos per entry (vs 3 for free)',
    'Entry view counts and engagement insights',
    'Sponsor activity dashboard',
    'Custom sponsorship tiers (set your own prices)',
    'Stripe Connect payouts to your bank',
    'Priority support',
    'Profile badges and verification',
    'Early access to new features'
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Crown className="w-8 h-8 text-[#ac6d46]" />
            <h1 className="text-3xl font-bold dark:text-[#e5e5e5]">
              EXPLORER PRO
            </h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] text-center leading-relaxed">
            Transform your exploration into sustainable income. Receive sponsorships, access advanced tools, 
            and build a community of supporters who fund your expeditions.
          </p>
        </div>
      </div>

      {/* Main Pricing Section */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#ac6d46] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-bold text-xl">PRICING & CHECKOUT</span>
            </div>
            <div className="text-xs font-mono">
              Cancel anytime · No commitment
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex border-2 border-[#202020] dark:border-[#616161]">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-8 py-4 font-bold text-sm transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-[#ac6d46] text-white'
                      : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]'
                  }`}
                >
                  <div className="text-xs mb-1">MONTHLY</div>
                  <div className="text-2xl">${monthlyPrice}</div>
                  <div className="text-xs opacity-80">per month</div>
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-8 py-4 font-bold text-sm transition-all relative ${
                    billingPeriod === 'annual'
                      ? 'bg-[#ac6d46] text-white'
                      : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]'
                  }`}
                >
                  <span className="absolute -top-3 -right-3 bg-[#4676ac] text-white text-xs px-2 py-1 font-bold">
                    SAVE ${annualSavings}
                  </span>
                  <div className="text-xs mb-1">ANNUAL</div>
                  <div className="text-2xl">${annualPrice}</div>
                  <div className="text-xs opacity-80">${(annualPrice / 12).toFixed(2)}/month</div>
                </button>
              </div>
            </div>

            {/* Selected Plan Details */}
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
                    SELECTED PLAN
                  </div>
                  <div className="text-xl font-bold dark:text-[#e5e5e5] mb-2">
                    Explorer Pro — {billingPeriod === 'monthly' ? 'Monthly' : 'Annual'}
                  </div>
                  <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                    {billingPeriod === 'monthly' 
                      ? 'Billed monthly. Cancel anytime with no penalties.'
                      : `Billed annually. Save $${annualSavings} compared to monthly billing.`
                    }
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-[#ac6d46]">
                    ${billingPeriod === 'monthly' ? monthlyPrice : annualPrice}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                    {billingPeriod === 'monthly' ? '/month' : '/year'}
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Button */}
            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className={`w-full py-4 font-bold text-lg flex items-center justify-center gap-3 transition-all border-2 ${
                isProcessing
                  ? 'bg-[#b5bcc4] border-[#b5bcc4] cursor-not-allowed text-white'
                  : 'bg-[#ac6d46] border-[#ac6d46] hover:bg-[#8a5738] hover:border-[#8a5738] text-white'
              }`}
            >
              <Lock className="w-5 h-5" />
              {isProcessing ? 'PROCESSING...' : 'PROCEED TO SECURE CHECKOUT'}
            </button>

            <div className="mt-3 text-center text-xs text-[#616161] dark:text-[#b5bcc4] flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure payment processing powered by Stripe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#4676ac] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="font-bold text-xl">CORE FEATURES</div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx}
                className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all active:scale-[0.98]"
              >
                <Icon className="w-8 h-8 text-[#ac6d46] mb-3" />
                <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">
                  {feature.title}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  {feature.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Feature List */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="font-bold text-xl">COMPLETE FEATURE LIST</div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {includedFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                <div className="text-sm dark:text-[#e5e5e5]">{feature}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 text-center">
          <Users className="w-10 h-10 text-[#ac6d46] mx-auto mb-3" />
          <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">1,200+</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            Explorer Pro members worldwide
          </div>
        </div>
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 text-center">
          <Shield className="w-10 h-10 text-[#4676ac] mx-auto mb-3" />
          <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">100%</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            Secure Stripe payment processing
          </div>
        </div>
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 text-center">
          <DollarSign className="w-10 h-10 text-[#ac6d46] mx-auto mb-3" />
          <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">5%</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            Platform fee on sponsorships received
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            <span className="font-bold text-xl">FREQUENTLY ASKED QUESTIONS</span>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">How does sponsorship receiving work?</div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Once you upgrade to Explorer Pro, you can enable sponsorships on your expeditions. 
              Sponsors can then send you financial support through Stripe. Payouts are processed 
              monthly directly to your bank account.
            </div>
          </div>

          <div>
            <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">Can I cancel anytime?</div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Yes! There are no long-term commitments. You can cancel your subscription anytime 
              from your billing settings. You'll continue to have Pro access until the end of 
              your current billing period.
            </div>
          </div>

          <div>
            <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">What payment methods do you accept?</div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              We accept all major credit cards (Visa, Mastercard, American Express) and debit 
              cards through Stripe's secure payment processing.
            </div>
          </div>

          <div>
            <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">Do you offer refunds?</div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              If you cancel within the first 7 days of your subscription, we offer a full refund. 
              After that, we offer pro-rated refunds if you downgrade during your billing period.
            </div>
          </div>

          <div>
            <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">What fees do you take from sponsorships?</div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              heimursaga.com takes a 5% platform fee from received sponsorships, plus standard 
              Stripe processing fees (2.9% + $0.30 per transaction). The rest goes directly to you.
            </div>
          </div>

          <div>
            <div className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">Can I upgrade from monthly to annual?</div>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Yes! You can switch between monthly and annual billing anytime from your billing 
              settings. We'll pro-rate the difference and adjust your billing accordingly.
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4 text-center">
        <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
          Have questions about Explorer Pro?{' '}
          <Link href="/contact" className="text-[#ac6d46] hover:text-[#4676ac] font-bold">
            Contact our team
          </Link>
          {' '}or{' '}
          <Link href="/documentation" className="text-[#ac6d46] hover:text-[#4676ac] font-bold">
            read the documentation
          </Link>
        </div>
      </div>
    </div>
  );
}