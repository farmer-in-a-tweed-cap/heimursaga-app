'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, ArrowRight, BarChart3, Settings, DollarSign, MessageSquare, FileText, Eye, Receipt, CreditCard, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { formatCurrency } from '@/app/utils/formatCurrency';

export function UpgradeSuccessPage() {
  const searchParams = useSearchParams();
  const { refreshUser, user } = useAuth();
  const plan = searchParams.get('plan') || 'monthly';

  // Promo data from checkout
  const promoCode = searchParams.get('promoCode');
  const amountCents = searchParams.get('amount') ? Number(searchParams.get('amount')) : null;
  const discountCents = searchParams.get('discount') ? Number(searchParams.get('discount')) : null;
  const percentOff = searchParams.get('percentOff') ? Number(searchParams.get('percentOff')) : null;
  const amountOff = searchParams.get('amountOff') ? Number(searchParams.get('amountOff')) : null;
  const promoDuration = searchParams.get('duration');
  const durationMonths = searchParams.get('durationMonths') ? Number(searchParams.get('durationMonths')) : null;

  // Compute display amount: use promo amount if provided, otherwise default
  const baseAmount = plan === 'monthly' ? 7 : 50;
  const displayAmount = amountCents !== null ? amountCents / 100 : baseAmount;
  const hasPromo = !!promoCode;

  // Promo description text
  const promoDescription = hasPromo
    ? percentOff
      ? `${percentOff}% off`
      : amountOff
        ? `$${formatCurrency(amountOff / 100)} off`
        : 'Discount applied'
    : null;

  const promoDurationText = hasPromo
    ? promoDuration === 'once'
      ? ' (first payment)'
      : promoDuration === 'repeating' && durationMonths
        ? ` for ${durationMonths} month${durationMonths > 1 ? 's' : ''}`
        : promoDuration === 'forever'
          ? ' (forever)'
          : ''
    : '';

  // Poll with exponential backoff: start at 1s, max 5s, for up to 60 seconds total
  const [roleUpdated, setRoleUpdated] = useState(user?.role === 'creator');
  const [pollFailed, setPollFailed] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  useEffect(() => {
    if (roleUpdated) return;

    let elapsed = 0;
    let delay = 1000;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        await refreshUser();
      } catch {
        // ignore refresh errors
      }
      elapsed += delay;

      if (elapsed >= 60000) {
        setPollFailed(true);
        return;
      }

      // Exponential backoff: 1s → 2s → 4s → 5s (cap)
      delay = Math.min(delay * 2, 5000);
      timeoutId = setTimeout(poll, delay);
    };

    timeoutId = setTimeout(poll, delay);
    return () => clearTimeout(timeoutId);
  }, [refreshUser, roleUpdated]);

  // Watch for role change from auth context
  useEffect(() => {
    if (user?.role === 'creator') {
      setRoleUpdated(true);
      setPollFailed(false);
    }
  }, [user?.role]);

  const handleManualRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await refreshUser();
    } catch {
      // ignore
    }
    setManualRefreshing(false);
  }, [refreshUser]);

  // Transaction details will be shown from the payment
  const [timestamp] = useState(() => new Date());
  const [nextBillingDate] = useState(() => {
    return new Date(Date.now() + (plan === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
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
                ${formatCurrency(displayAmount)}
              </div>
              {hasPromo && (
                <div className="mb-2">
                  <span className="text-lg line-through text-[#b5bcc4]">${baseAmount}.00</span>
                </div>
              )}
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Payment processed successfully
              </div>
            </div>

            {/* Promo applied banner */}
            {hasPromo && (
              <div className="bg-[#4676ac]/10 border-2 border-[#4676ac] p-4 mb-6">
                <div className="flex items-center gap-2 justify-center">
                  <Check className="w-4 h-4 text-[#4676ac]" />
                  <span className="font-bold text-sm text-[#4676ac]">
                    {promoCode!.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    — {promoDescription}{promoDurationText}
                  </span>
                </div>
                {discountCents !== null && discountCents > 0 && (
                  <div className="text-center mt-2 text-sm text-[#4676ac] font-bold">
                    You saved ${formatCurrency(discountCents / 100)}
                  </div>
                )}
              </div>
            )}

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

          {/* Role update status */}
          {pollFailed && !roleUpdated && (
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#ac6d46] p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ac6d46] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Account upgrade processing</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                    Your payment was successful but your account upgrade is still being processed. This usually takes a few moments. Pro features will be available as soon as processing completes.
                  </div>
                  <button
                    onClick={handleManualRefresh}
                    disabled={manualRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-xs font-bold dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${manualRefreshing ? 'animate-spin' : ''}`} />
                    {manualRefreshing ? 'CHECKING...' : 'CHECK AGAIN'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                <DollarSign className="w-8 h-8" />
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
                  Upload up to 10 photos per entry (vs 2 for free)
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
