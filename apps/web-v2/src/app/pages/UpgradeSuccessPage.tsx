'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Crown, ArrowRight, BarChart3, Settings, DollarSign, MessageSquare, FileText, Eye, Receipt, CreditCard, Sparkles } from 'lucide-react';

export function UpgradeSuccessPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'monthly';
  const amount = plan === 'monthly' ? 7 : 50;

  // Transaction details will be shown from the payment
  const [timestamp] = useState(() => new Date());
  const [nextBillingDate] = useState(() => {
    return new Date(Date.now() + (plan === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Success Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#ac6d46] text-white p-8 border-b-2 border-[#202020] dark:border-[#616161] text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-12 h-12 text-[#ac6d46]" strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-bold mb-2">PAYMENT SUCCESSFUL</h1>
          <p className="text-sm">
            Welcome to Explorer Pro! Your account has been upgraded.
          </p>
        </div>

        {/* Transaction Summary */}
        <div className="p-6">
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b-2 border-[#b5bcc4] dark:border-[#616161]">
              <Receipt className="w-5 h-5 text-[#4676ac]" />
              <div className="text-sm font-bold dark:text-[#e5e5e5]">TRANSACTION DETAILS</div>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-[#ac6d46] mb-2">
                ${amount}.00
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Payment processed successfully
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                  PLAN TYPE
                </div>
                <div className="text-sm font-bold dark:text-[#e5e5e5]">
                  Explorer Pro — {plan === 'monthly' ? 'Monthly' : 'Annual'}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                  TRANSACTION DATE
                </div>
                <div className="text-sm font-bold dark:text-[#e5e5e5]">
                  {timestamp.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                  NEXT BILLING DATE
                </div>
                <div className="text-sm font-bold dark:text-[#e5e5e5]">
                  {nextBillingDate}
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Notice */}
          <div className="bg-[#4676ac] text-white border-2 border-[#4676ac] p-4 mb-6">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm mb-1">Receipt sent to your email</div>
                <div className="text-xs opacity-90">
                  A confirmation email with your receipt has been sent. You can download receipts anytime from your billing settings.
                </div>
              </div>
            </div>
          </div>

          {/* Stripe Connect Notice */}
          <div className="bg-[#ac6d46] text-white border-2 border-[#ac6d46] p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm mb-1">Next Step: Connect Your Stripe Account</div>
                <div className="text-xs opacity-90">
                  To receive sponsorships, you'll need to complete Stripe Connect onboarding. This secure process links your bank account for payouts. You can start this in your Sponsorship Management dashboard.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#ac6d46] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="font-bold text-xl">GET STARTED WITH EXPLORER PRO</div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary action */}
            <Link
              href="/sponsorship"
              className="bg-[#ac6d46] text-white p-6 hover:bg-[#8a5738] transition-all border-2 border-[#ac6d46]"
            >
              <div className="flex items-start justify-between mb-4">
                <Crown className="w-8 h-8" />
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="font-bold text-lg mb-2">Set Up Sponsorships</div>
              <div className="text-sm opacity-90">
                Connect Stripe to receive payments, configure your sponsorship tiers, and start accepting support from your audience.
              </div>
            </Link>

            {/* Secondary actions */}
            <Link
              href="/edit-profile"
              className="bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <Settings className="w-8 h-8 text-[#4676ac]" />
                <ArrowRight className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
              </div>
              <div className="font-bold text-lg mb-2 dark:text-[#e5e5e5]">Update Your Profile</div>
              <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                Add your bio, website, and social links to help sponsors discover you.
              </div>
            </Link>

            <Link
              href="/select-expedition"
              className="bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <FileText className="w-8 h-8 text-[#4676ac]" />
                <ArrowRight className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
              </div>
              <div className="font-bold text-lg mb-2 dark:text-[#e5e5e5]">Create an Expedition</div>
              <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                Start documenting your journey with entries, Expedition Notes, and sponsor-only content.
              </div>
            </Link>

            <Link
              href="/messages"
              className="bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <MessageSquare className="w-8 h-8 text-[#4676ac]" />
                <ArrowRight className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
              </div>
              <div className="font-bold text-lg mb-2 dark:text-[#e5e5e5]">Private Messages</div>
              <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                Connect directly with your sponsors and other explorers.
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Pro Features Overview */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#4676ac] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="font-bold text-xl">YOUR EXPLORER PRO FEATURES</div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#4676ac] flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Receive Sponsorships</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  One-time contributions and monthly subscriptions from supporters
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#4676ac] flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Private Messaging</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Direct communication with sponsors and explorers
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#4676ac] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Additional Entry Types</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Sponsor-only entries and Expedition Notes (280-char updates)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#4676ac] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">More Photos Per Entry</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Upload up to 10 photos per entry (vs 3 for free)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#4676ac] flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Expedition Insights</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Entry views, engagement metrics, and sponsor activity
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#4676ac] flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Sponsor-Only Content</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Create exclusive entries visible only to supporters
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4 text-center">
        <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
          Questions about your subscription?{' '}
          <Link href="/settings/billing" className="text-[#ac6d46] hover:text-[#4676ac] font-bold">
            Manage billing settings
          </Link>
          {' '}or{' '}
          <Link href="/contact" className="text-[#ac6d46] hover:text-[#4676ac] font-bold">
            contact support
          </Link>
        </div>
      </div>
    </div>
  );
}