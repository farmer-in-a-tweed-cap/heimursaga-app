'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Calendar,
  HandHeart,
  Loader2,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  sponsorshipApi,
  payoutApi,
  type SponsorshipTierFull,
  type SponsorshipFull,
  type PayoutBalance,
  type PayoutMethod,
  type Payout,
} from '@/app/services/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/app/utils/formatCurrency';
import {
  ONE_TIME_TIER_SLOTS,
  MONTHLY_TIER_SLOTS,
  getTierSlotConfig,
  isValidTierPrice,
  validateTierOrdering,
  getTierLabel,
  getPerksForSlot,
} from '@repo/types';

type ViewType = 'overview' | 'tiers' | 'sponsors' | 'payouts' | 'stripe';

// Stripe Connect supported countries
// https://stripe.com/docs/connect/cross-border-payouts
const STRIPE_SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IN', name: 'India' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TH', name: 'Thailand' },
  { code: 'AE', name: 'United Arab Emirates' },
];

export function SponsorshipsAdminPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { isPro } = useProFeatures();
  const [selectedView, setSelectedView] = useState<ViewType>('overview');
  const [editingTiers, setEditingTiers] = useState(false);

  // Data state
  const [tiers, setTiers] = useState<SponsorshipTierFull[]>([]);
  const [receivedSponsorships, setReceivedSponsorships] = useState<SponsorshipFull[]>([]);
  const [stripePayments, setStripePayments] = useState<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    refunded: boolean;
    created: string;
    sponsorEmail?: string;
    sponsorName?: string;
    sponsorUsername?: string;
    description?: string;
    sponsorshipType?: string;
    entry?: { id: string; title: string };
    expedition?: { id: string; title: string };
  }>>([]);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Country selector modal state
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('US');

  // Expanded payment detail state
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  // Refund confirmation modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<{ chargeId: string; amount: number } | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Stripe onboarding guide modal state
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [pendingOnboardingUrl, setPendingOnboardingUrl] = useState<string>('');

  // Delete tier confirmation modal state
  const [showDeleteTierModal, setShowDeleteTierModal] = useState(false);
  const [deleteTierTarget, setDeleteTierTarget] = useState<string | null>(null);
  const [isDeletingTier, setIsDeletingTier] = useState(false);

  // Tier editing state - separate for one-time and monthly
  const [editedOneTimeTiers, setEditedOneTimeTiers] = useState<Array<{
    id?: string;
    price: number;
    description: string;
    isAvailable: boolean;
    priority: number;
    membersCount?: number;
  }>>([]);
  const [editedMonthlyTiers, setEditedMonthlyTiers] = useState<Array<{
    id?: string;
    price: number;
    description: string;
    isAvailable: boolean;
    priority: number;
    membersCount?: number;
  }>>([]);

  // Fetch data on mount
  useEffect(() => {
    if (isPro) {
      fetchData();
    }
  }, [isPro]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tiersRes, sponsorshipsRes, stripePaymentsRes, balanceRes, payoutMethodsRes, payoutsRes] = await Promise.all([
        sponsorshipApi.getMyTiers().catch(() => ({ results: 0, data: [] })),
        sponsorshipApi.getReceivedSponsorships().catch(() => ({ results: 0, data: [] })),
        sponsorshipApi.getStripePayments().catch(() => ({ results: 0, data: [] })),
        payoutApi.getBalance().catch(() => ({
          available: { amount: 0, currency: 'USD', symbol: '$' },
          pending: { amount: 0, currency: 'USD', symbol: '$' },
        })),
        payoutApi.getPayoutMethods().catch(() => ({ results: 0, data: [] })),
        payoutApi.getPayouts().catch(() => ({ results: 0, data: [] })),
      ]);

      setStripePayments(stripePaymentsRes.data || []);

      setTiers(tiersRes.data || []);

      // Separate tiers by type, ensuring all 3 slots are populated
      const apiOneTime = (tiersRes.data || []).filter(t => t.type === 'ONE_TIME');
      const apiMonthly = (tiersRes.data || []).filter(t => t.type === 'MONTHLY');

      const oneTimeTiers = ONE_TIME_TIER_SLOTS.map(slotDef => {
        const existing = apiOneTime.find(t => t.priority === slotDef.slot);
        return existing
          ? { id: existing.id, price: existing.price, description: existing.description, isAvailable: existing.isAvailable, priority: existing.priority || slotDef.slot, membersCount: existing.membersCount }
          : { price: slotDef.defaultPrice, description: slotDef.label, isAvailable: true, priority: slotDef.slot };
      });

      const monthlyTiers = MONTHLY_TIER_SLOTS.map(slotDef => {
        const existing = apiMonthly.find(t => t.priority === slotDef.slot);
        return existing
          ? { id: existing.id, price: existing.price, description: existing.description, isAvailable: existing.isAvailable, priority: existing.priority || slotDef.slot, membersCount: existing.membersCount }
          : { price: slotDef.defaultPrice, description: slotDef.label, isAvailable: true, priority: slotDef.slot };
      });

      setEditedOneTimeTiers(oneTimeTiers);
      setEditedMonthlyTiers(monthlyTiers);
      setReceivedSponsorships(sponsorshipsRes.data || []);
      setBalance(balanceRes);
      setPayoutMethods(payoutMethodsRes.data || []);
      setPayouts(payoutsRes.data || []);
    } catch {
      toast.error('Failed to load sponsorship data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTiers = async () => {
    // Validate price ranges
    for (const tier of editedOneTimeTiers) {
      if (!isValidTierPrice('ONE_TIME', tier.priority, tier.price)) {
        const config = getTierSlotConfig('ONE_TIME', tier.priority);
        toast.error(`${config?.label || 'Tier'}: Price must be $${config?.minPrice} – $${config?.maxPrice ?? '∞'}`);
        return;
      }
    }

    for (const tier of editedMonthlyTiers) {
      if (!isValidTierPrice('MONTHLY', tier.priority, tier.price)) {
        const config = getTierSlotConfig('MONTHLY', tier.priority);
        toast.error(`${getTierLabel('MONTHLY', tier.priority)}: Price must be $${config?.minPrice} – $${config?.maxPrice}/mo`);
        return;
      }
    }

    // Validate ordering
    const monthlyPrices = editedMonthlyTiers.map(t => ({ slot: t.priority, price: t.price }));
    if (!validateTierOrdering(monthlyPrices)) {
      toast.error('Tier prices must increase with each level');
      return;
    }

    const oneTimePrices = editedOneTimeTiers.map(t => ({ slot: t.priority, price: t.price }));
    if (!validateTierOrdering(oneTimePrices)) {
      toast.error('One-time tier prices must increase with each level');
      return;
    }

    setIsSavingTiers(true);
    try {
      // Save one-time tiers
      for (const tier of editedOneTimeTiers) {
        const label = getTierLabel('ONE_TIME', tier.priority);
        if (tier.id) {
          await sponsorshipApi.updateTier(tier.id, {
            price: tier.price,
            description: label,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        } else {
          await sponsorshipApi.createTier({
            type: 'ONE_TIME',
            price: tier.price,
            description: label,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        }
      }

      // Save monthly tiers
      for (const tier of editedMonthlyTiers) {
        const label = getTierLabel('MONTHLY', tier.priority);
        if (tier.id) {
          await sponsorshipApi.updateTier(tier.id, {
            price: tier.price,
            description: label,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        } else {
          await sponsorshipApi.createTier({
            type: 'MONTHLY',
            price: tier.price,
            description: label,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        }
      }

      toast.success('Sponsorship tiers saved successfully');
      setEditingTiers(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save sponsorship tiers');
    } finally {
      setIsSavingTiers(false);
    }
  };

  const confirmDeleteTier = async () => {
    if (!deleteTierTarget) return;

    setIsDeletingTier(true);
    try {
      await sponsorshipApi.deleteTier(deleteTierTarget);
      toast.success('Tier deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete tier');
    } finally {
      setIsDeletingTier(false);
      setShowDeleteTierModal(false);
      setDeleteTierTarget(null);
    }
  };

  const handleStartStripeOnboarding = async () => {
    // If no payout method exists, show country selector first
    if (payoutMethods.length === 0) {
      setShowCountryModal(true);
      return;
    }

    // Continue with existing payout method
    await proceedWithOnboarding(payoutMethods[0].id);
  };

  const proceedWithOnboarding = async (existingPayoutMethodId?: string) => {
    setIsStartingOnboarding(true);
    setShowCountryModal(false);

    try {
      let payoutMethodId: string;

      if (existingPayoutMethodId) {
        payoutMethodId = existingPayoutMethodId;
      } else {
        // Create new payout method with selected country
        const createRes = await payoutApi.createPayoutMethod({ country: selectedCountry });
        payoutMethodId = createRes.payoutMethodId;
      }

      // Get onboarding link
      const { url } = await payoutApi.getOnboardingLink({
        payoutMethodId,
        mode: 'onboarding',
        backUrl: window.location.href,
      });

      // Validate Stripe redirect URL before navigating
      try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith('stripe.com')) {
          throw new Error('Invalid onboarding URL');
        }
        // Show guide modal instead of immediately redirecting
        setPendingOnboardingUrl(url);
        setShowOnboardingGuide(true);
      } catch {
        toast.error('Received an invalid onboarding URL. Please try again.');
        return;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start Stripe onboarding');
    } finally {
      setIsStartingOnboarding(false);
    }
  };

  const handleContinueToStripe = () => {
    if (pendingOnboardingUrl) {
      window.location.href = pendingOnboardingUrl;
    }
  };

  const handleRefund = (chargeId: string, amount: number) => {
    setRefundTarget({ chargeId, amount });
    setShowRefundModal(true);
  };

  const confirmRefund = async () => {
    if (!refundTarget) return;

    setIsProcessingRefund(true);
    try {
      const result = await sponsorshipApi.issueRefund(refundTarget.chargeId);
      if (result.success) {
        toast.success('Refund issued successfully');
        // Refresh data to show updated status
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to issue refund');
    } finally {
      setIsProcessingRefund(false);
      setShowRefundModal(false);
      setRefundTarget(null);
    }
  };

  // Calculate stats - use Stripe payments as source of truth for revenue
  const activeSubscribers = receivedSponsorships.filter(
    (s) => s.type?.toUpperCase() === 'SUBSCRIPTION' && s.status?.toUpperCase() === 'ACTIVE'
  ).length;
  // Only count non-refunded payments as sponsors
  const nonRefundedPayments = stripePayments.filter((p) => !p.refunded);
  const totalSponsors = Math.max(receivedSponsorships.length, nonRefundedPayments.length);
  const monthlyRecurring = receivedSponsorships
    .filter((s) => s.type?.toUpperCase() === 'SUBSCRIPTION' && s.status?.toUpperCase() === 'ACTIVE')
    .reduce((sum, s) => sum + s.amount, 0);
  // Use Stripe payments for accurate revenue (source of truth), exclude refunded
  const totalRevenue = stripePayments.length > 0
    ? nonRefundedPayments.reduce((sum, p) => sum + p.amount, 0)
    : receivedSponsorships.reduce((sum, s) => sum + s.amount, 0);

  // Stripe Connect status
  const stripeConnected = payoutMethods.length > 0 && payoutMethods[0].isVerified;
  const stripeStatus = payoutMethods.length > 0
    ? (payoutMethods[0].accountStatus || (payoutMethods[0].isVerified ? 'active' : 'onboarding_incomplete'))
    : 'not_connected';

  // Check if user is Explorer Pro (skip when embedded - parent handles access)
  if (!embedded && !isPro) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#ac6d46]" />
          <h1 className="text-2xl font-bold mb-4 dark:text-[#e5e5e5]">EXPLORER PRO REQUIRED</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
            Sponsorship management is only available for Explorer Pro accounts.
          </p>
          <Link
            href="/upgrade"
            className="inline-block px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            UPGRADE TO EXPLORER PRO
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#616161]" />
        <p className="mt-4 text-[#616161] dark:text-[#b5bcc4]">Loading sponsorship data...</p>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'max-w-[1600px] mx-auto px-6 py-12'}>
      {/* Country Selector Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-lg font-bold dark:text-[#e5e5e5]">SELECT YOUR COUNTRY</h2>
              <button
                onClick={() => setShowCountryModal(false)}
                aria-label="Close"
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                Select the country where your bank account is located. This determines your payout currency and tax requirements.
              </p>
              <div className="relative mb-4">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] dark:text-[#e5e5e5] appearance-none cursor-pointer font-medium"
                >
                  {STRIPE_SUPPORTED_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" />
              </div>
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Note:</strong> You cannot change your country after setup. Make sure to select the correct country.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCountryModal(false)}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => proceedWithOnboarding()}
                  disabled={isStartingOnboarding}
                  className="flex-1 py-3 bg-[#ac6d46] text-white font-bold text-sm hover:bg-[#8a5738] transition-all flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                >
                  {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {showRefundModal && refundTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-lg font-bold dark:text-[#e5e5e5]">CONFIRM REFUND</h2>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundTarget(null);
                }}
                aria-label="Close"
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                Are you sure you want to refund <strong className="text-[#ac6d46]">${formatCurrency(refundTarget.amount)}</strong>?
              </p>
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#994040] text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Warning:</strong> This action cannot be undone. The full amount will be returned to the sponsor.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundTarget(null);
                  }}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmRefund}
                  disabled={isProcessingRefund}
                  className="flex-1 py-3 bg-[#994040] text-white font-bold text-sm hover:bg-[#7a3333] transition-all flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                >
                  {isProcessingRefund && <Loader2 className="w-4 h-4 animate-spin" />}
                  ISSUE REFUND
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tier Confirmation Modal */}
      {showDeleteTierModal && deleteTierTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-lg font-bold dark:text-[#e5e5e5]">DELETE TIER</h2>
              <button
                onClick={() => {
                  setShowDeleteTierModal(false);
                  setDeleteTierTarget(null);
                }}
                aria-label="Close"
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                Are you sure you want to delete this sponsorship tier?
              </p>
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Note:</strong> Existing sponsors on this tier will not be affected, but new sponsors will not be able to select it.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteTierModal(false);
                    setDeleteTierTarget(null);
                  }}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeleteTier}
                  disabled={isDeletingTier}
                  className="flex-1 py-3 bg-[#994040] text-white font-bold text-sm hover:bg-[#7a3333] transition-all flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                >
                  {isDeletingTier && <Loader2 className="w-4 h-4 animate-spin" />}
                  DELETE TIER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Onboarding Guide Modal */}
      {showOnboardingGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-lg font-bold dark:text-[#e5e5e5]">BEFORE YOU START</h2>
              <button
                onClick={() => {
                  setShowOnboardingGuide(false);
                  setPendingOnboardingUrl('');
                }}
                aria-label="Close"
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                You're about to be redirected to Stripe to set up your payout account. Here's what to expect:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Info className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Business type</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Select <strong className="dark:text-[#e5e5e5]">Individual</strong> unless you operate as a registered business entity.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Info className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Industry</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Choose something like <strong className="dark:text-[#e5e5e5]">Other services</strong> or <strong className="dark:text-[#e5e5e5]">Digital content / media</strong>.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Info className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Personal information</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      You'll need your <strong className="dark:text-[#e5e5e5]">date of birth</strong>, <strong className="dark:text-[#e5e5e5]">address</strong>, and the last 4 digits of your <strong className="dark:text-[#e5e5e5]">SSN</strong> (US) or equivalent ID.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Info className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Business website</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Enter <strong className="dark:text-[#e5e5e5]">heimursaga.com</strong> as your business website.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Info className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Payout method</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      You can use a <strong className="dark:text-[#e5e5e5]">bank account</strong> or <strong className="dark:text-[#e5e5e5]">debit card</strong> to receive payouts.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-start p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
                <Shield className="w-5 h-5 text-[#4676ac] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  <strong className="dark:text-[#e5e5e5]">Your data is secure.</strong> All sensitive information is collected and stored directly by Stripe. Heimursaga never sees your bank details, SSN, or identity documents.
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowOnboardingGuide(false);
                    setPendingOnboardingUrl('');
                  }}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleContinueToStripe}
                  className="flex-1 py-3 bg-[#ac6d46] text-white font-bold text-sm hover:bg-[#8a5738] transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                >
                  <ExternalLink className="w-4 h-4" />
                  CONTINUE TO STRIPE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header - only shown when standalone */}
      {!embedded && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              <div className="flex items-center gap-3">
                <HandHeart className="w-6 h-6 text-[#ac6d46]" />
                <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">SPONSORSHIP MANAGEMENT</h1>
              </div>
              <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">EXPLORER PRO</span>
            </div>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
              Manage your sponsorship tiers, sponsors, and payouts
            </p>
          </div>
        </div>
      )}

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#ac6d46]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">TOTAL REVENUE</div>
          </div>
          <div className="text-3xl font-medium text-[#ac6d46]">${formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">All-time</div>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#616161]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">MONTHLY RECURRING</div>
          </div>
          <div className="text-3xl font-medium dark:text-[#e5e5e5]">${formatCurrency(monthlyRecurring)}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">{activeSubscribers} subscribers</div>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#616161]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">TOTAL SPONSORS</div>
          </div>
          <div className="text-3xl font-medium dark:text-[#e5e5e5]">{totalSponsors}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Lifetime</div>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[#616161]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">AVAILABLE</div>
          </div>
          <div className="text-2xl font-medium dark:text-[#e5e5e5]">
            {balance?.available.symbol}
            {formatCurrency(balance?.available.amount || 0)}
          </div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Ready for payout</div>
        </div>
      </div>

      {/* Stripe Connect Status Banner */}
      {stripeStatus === 'active' && (
        <div className="bg-[#616161] text-white border-2 border-[#616161] mb-6 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div className="flex-1 text-sm font-bold">Stripe Connected - Ready to receive sponsorships</div>
            <button onClick={() => setSelectedView('stripe')} className="text-xs text-white opacity-90 hover:opacity-100 font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-white">
              MANAGE
            </button>
          </div>
        </div>
      )}
      {stripeStatus === 'not_connected' && (
        <div className="bg-[#ac6d46] text-white border-2 border-[#ac6d46] mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-xl mb-2">Connect Your Stripe Account</div>
                <div className="text-sm mb-4 opacity-90">
                  To receive sponsorships and payouts, you must connect your Stripe account. This secure process links
                  your bank account for direct deposits.
                </div>
                <button
                  onClick={handleStartStripeOnboarding}
                  disabled={isStartingOnboarding}
                  className="px-6 py-3 bg-white text-[#ac6d46] font-bold hover:bg-[#f5f5f5] transition-all text-sm disabled:opacity-50 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                >
                  {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                  START STRIPE ONBOARDING
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {stripeStatus === 'onboarding_incomplete' && (
        <div className="bg-[#ac6d46] text-white border-2 border-[#ac6d46] mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-xl mb-2">Complete Stripe Onboarding</div>
                <div className="text-sm mb-4 opacity-90">
                  Your Stripe account has been created but setup is not yet complete. Continue onboarding to start receiving sponsorships.
                </div>
                <button
                  onClick={handleStartStripeOnboarding}
                  disabled={isStartingOnboarding}
                  className="px-6 py-3 bg-white text-[#ac6d46] font-bold hover:bg-[#f5f5f5] transition-all text-sm disabled:opacity-50 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                >
                  {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                  CONTINUE ONBOARDING
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {stripeStatus === 'pending_review' && (
        <div className="bg-[#4676ac] text-white border-2 border-[#4676ac] mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <Loader2 className="w-8 h-8 flex-shrink-0 animate-spin" />
              <div className="flex-1">
                <div className="font-bold text-xl mb-2">Verification In Progress</div>
                <div className="text-sm mb-4 opacity-90">
                  Your documents are being reviewed. This usually takes 1-2 business days.
                </div>
                <button
                  onClick={() => setSelectedView('stripe')}
                  className="px-6 py-3 border-2 border-white text-white font-bold hover:bg-white hover:text-[#4676ac] transition-all text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-white"
                >
                  VIEW DETAILS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {stripeStatus === 'action_required' && (
        <div className="bg-[#994040] text-white border-2 border-[#994040] mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-xl mb-2">ACTION REQUIRED: Additional Information Needed</div>
                {payoutMethods[0]?.requirementsCurrentlyDue && payoutMethods[0].requirementsCurrentlyDue.length > 0 && (
                  <ul className="text-sm mb-4 opacity-90 list-disc list-inside">
                    {payoutMethods[0].requirementsCurrentlyDue.slice(0, 3).map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                    {payoutMethods[0].requirementsCurrentlyDue.length > 3 && (
                      <li>and {payoutMethods[0].requirementsCurrentlyDue.length - 3} more...</li>
                    )}
                  </ul>
                )}
                <button
                  onClick={handleStartStripeOnboarding}
                  disabled={isStartingOnboarding}
                  className="px-6 py-3 bg-white text-[#994040] font-bold hover:bg-[#f5f5f5] transition-all text-sm disabled:opacity-50 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                >
                  {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                  COMPLETE REQUIREMENTS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {stripeStatus === 'restricted' && (
        <div className="bg-[#994040] text-white border-2 border-[#994040] mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-xl mb-2">Account Restricted</div>
                <div className="text-sm mb-4 opacity-90">
                  Your account has been restricted. Visit the Stripe Dashboard or contact support for more information.
                </div>
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#994040] font-bold hover:bg-[#f5f5f5] transition-all text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                >
                  <ExternalLink className="w-4 h-4" />
                  OPEN STRIPE DASHBOARD
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="border-b-2 border-[#202020] dark:border-[#616161] flex overflow-x-auto">
          {(['overview', 'tiers', 'sponsors', 'payouts', 'stripe'] as ViewType[]).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`flex-1 py-3 px-4 text-sm font-bold whitespace-nowrap border-r-2 border-[#202020] dark:border-[#616161] last:border-r-0 ${
                selectedView === view
                  ? 'bg-[#ac6d46] text-white'
                  : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a]'
              } transition-all focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#ac6d46]`}
            >
              {view.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* OVERVIEW Tab */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              {/* Recent Payments from Stripe (Source of Truth) */}
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                <div className="bg-[#b5bcc4] dark:bg-[#3a3a3a] p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                  <h3 className="text-sm font-bold dark:text-[#e5e5e5]">RECENT PAYMENTS</h3>
                </div>
                <div className="p-4">
                  {stripePayments.length === 0 && receivedSponsorships.length === 0 ? (
                    <div className="text-center py-8 text-[#616161] dark:text-[#b5bcc4]">
                      No payments yet. Share your expedition to attract sponsors.
                    </div>
                  ) : stripePayments.length === 0 ? (
                    <div className="text-center py-8 text-[#616161] dark:text-[#b5bcc4]">
                      No payments found in Stripe. Your Stripe Connect account may still be setting up.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stripePayments.slice(0, 5).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]"
                        >
                          <div>
                            <div className="font-bold text-sm dark:text-[#e5e5e5]">
                              {payment.sponsorUsername ? (
                                <Link
                                  href={`/journal/${payment.sponsorUsername}`}
                                  className="text-[#4676ac] hover:underline"
                                >
                                  {payment.sponsorUsername}
                                </Link>
                              ) : (
                                payment.sponsorName || payment.sponsorEmail || 'Sponsor'
                              )}
                            </div>
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] flex items-center gap-2">
                              {new Date(payment.created).toLocaleDateString()}
                              {payment.sponsorshipType && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                  payment.sponsorshipType === 'subscription'
                                    ? 'bg-[#4676ac] text-white'
                                    : payment.sponsorshipType === 'quick_sponsor'
                                      ? 'bg-[#ac6d46] text-white'
                                      : 'bg-[#616161] text-white'
                                }`}>
                                  {payment.sponsorshipType === 'subscription' ? 'RECURRING' : payment.sponsorshipType === 'quick_sponsor' ? 'QUICK-SPONSOR' : 'ONE-TIME'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${payment.refunded ? 'text-[#616161] line-through' : 'text-[#ac6d46]'}`}>
                              ${formatCurrency(payment.amount)}
                            </div>
                            <div className="text-xs">
                              <span className={`px-2 py-0.5 text-xs font-bold ${
                                payment.refunded ? 'bg-[#616161]' : 'bg-[#598636]'
                              } text-white`}>
                                {payment.refunded ? 'REFUNDED' : payment.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedView('sponsors')}
                    className="w-full mt-4 py-2 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#202020] hover:text-white dark:hover:bg-[#616161] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020]"
                  >
                    VIEW ALL PAYMENTS
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedView('tiers')}
                  className="p-4 border-2 border-[#ac6d46] hover:bg-[#ac6d46] hover:text-white transition-all font-bold dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                >
                  MANAGE TIERS
                </button>
                <button
                  onClick={() => setSelectedView('payouts')}
                  className="p-4 border-2 border-[#4676ac] hover:bg-[#4676ac] hover:text-white transition-all font-bold dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                >
                  VIEW PAYOUTS
                </button>
                <Link
                  href={`/journal/${user?.username}`}
                  className="p-4 border-2 border-[#202020] dark:border-[#616161] hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all font-bold dark:text-[#e5e5e5] text-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020]"
                >
                  VIEW PUBLIC PROFILE
                </Link>
              </div>
            </div>
          )}

          {/* TIER SETTINGS Tab */}
          {selectedView === 'tiers' && (
            <div className="space-y-6">
              {/* Edit Mode Controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                  {stripeConnected
                    ? 'Configure your sponsorship tiers for one-time and monthly recurring sponsorships.'
                    : 'Complete Stripe onboarding to configure your sponsorship tiers.'}
                </div>
                <div className="flex gap-2">
                  {editingTiers ? (
                    <>
                      <button
                        onClick={handleSaveTiers}
                        disabled={isSavingTiers}
                        className="px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                      >
                        {isSavingTiers && <Loader2 className="w-4 h-4 animate-spin" />}
                        SAVE ALL CHANGES
                      </button>
                      <button
                        onClick={() => {
                          setEditingTiers(false);
                          // Reset to original data
                          const oneTime = tiers.filter(t => t.type === 'ONE_TIME').map((t, i) => ({
                            id: t.id, price: t.price, description: t.description,
                            isAvailable: t.isAvailable, priority: t.priority || i + 1, membersCount: t.membersCount,
                          }));
                          const monthly = tiers.filter(t => t.type === 'MONTHLY').map((t, i) => ({
                            id: t.id, price: t.price, description: t.description,
                            isAvailable: t.isAvailable, priority: t.priority || i + 1, membersCount: t.membersCount,
                          }));
                          setEditedOneTimeTiers(oneTime);
                          setEditedMonthlyTiers(monthly);
                        }}
                        className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-xs font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                      >
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingTiers(true)}
                      disabled={!stripeConnected}
                      className="px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                    >
                      EDIT TIERS
                    </button>
                  )}
                </div>
              </div>

              {/* TIER AMOUNTS */}
              {(() => {
                const monthlyPrices = editedMonthlyTiers.map(t => ({ slot: t.priority, price: t.price }));
                const hasOrderingError = editingTiers && monthlyPrices.length > 1 && !validateTierOrdering(monthlyPrices);
                const oneTimePrices = editedOneTimeTiers.map(t => ({ slot: t.priority, price: t.price }));
                const hasOneTimeOrderingError = editingTiers && oneTimePrices.length > 1 && !validateTierOrdering(oneTimePrices);

                return (
                  <div className="space-y-6">
                    {hasOrderingError && (
                      <div className="p-3 bg-[#994040]/10 border-2 border-[#994040] text-xs text-[#994040] font-bold">
                        Tier prices must increase with each level.
                      </div>
                    )}
                    {hasOneTimeOrderingError && (
                      <div className="p-3 bg-[#994040]/10 border-2 border-[#994040] text-xs text-[#994040] font-bold">
                        One-time tier prices must increase with each level.
                      </div>
                    )}

                    {/* Amount inputs row */}
                    <div className="grid grid-cols-3 gap-4">
                      {MONTHLY_TIER_SLOTS.map((slotDef) => {
                        const monthlyTier = editedMonthlyTiers.find(t => t.priority === slotDef.slot);
                        const oneTimeTier = editedOneTimeTiers.find(t => t.priority === slotDef.slot);
                        const isEnabled = (monthlyTier?.isAvailable ?? true) && (oneTimeTier?.isAvailable ?? true);
                        const monthlyPrice = monthlyTier?.price ?? slotDef.defaultPrice;
                        const isPriceValid = isValidTierPrice('MONTHLY', slotDef.slot, monthlyPrice);

                        return (
                          <div
                            key={slotDef.slot}
                            className={`bg-white dark:bg-[#202020] border-2 p-4 transition-all ${
                              !isEnabled ? 'border-[#b5bcc4]/50 dark:border-[#616161]/50 opacity-50' : 'border-[#202020] dark:border-[#616161]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                disabled={!editingTiers}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditedMonthlyTiers(prev => prev.map(t =>
                                    t.priority === slotDef.slot ? { ...t, isAvailable: checked } : t
                                  ));
                                  setEditedOneTimeTiers(prev => prev.map(t =>
                                    t.priority === slotDef.slot ? { ...t, isAvailable: checked } : t
                                  ));
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-xs font-bold tracking-wider text-[#202020] dark:text-[#e5e5e5]">
                                TIER {slotDef.slot}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-lg font-bold dark:text-[#e5e5e5]">$</span>
                              <input
                                type="number"
                                min={slotDef.minPrice}
                                max={slotDef.maxPrice ?? undefined}
                                value={monthlyPrice}
                                disabled={!editingTiers}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  setEditedMonthlyTiers(prev => prev.map(t =>
                                    t.priority === slotDef.slot ? { ...t, price: newPrice } : t
                                  ));
                                  const otConfig = getTierSlotConfig('ONE_TIME', slotDef.slot);
                                  if (otConfig) {
                                    const otPrice = Math.max(otConfig.minPrice, newPrice);
                                    setEditedOneTimeTiers(prev => prev.map(t =>
                                      t.priority === slotDef.slot ? { ...t, price: otPrice } : t
                                    ));
                                  }
                                }}
                                className={`w-full px-2 py-1.5 border-2 text-lg font-bold dark:bg-[#2a2a2a] dark:text-[#e5e5e5] disabled:bg-[#f5f5f5] dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed ${
                                  !isPriceValid && editingTiers ? 'border-[#994040]' : 'border-[#b5bcc4] dark:border-[#616161]'
                                }`}
                              />
                            </div>
                            <p className={`text-[10px] mt-1 ${!isPriceValid && editingTiers ? 'text-[#994040]' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>${slotDef.minPrice} – ${slotDef.maxPrice}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* MONTHLY TIERS */}
                    <div>
                      <div className="text-xs font-bold tracking-wider text-[#ac6d46]">MONTHLY TIERS</div>
                      <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mb-3">Perks cover current and future expeditions</div>
                      <div className="grid grid-cols-3 gap-4">
                        {MONTHLY_TIER_SLOTS.map((slotDef) => {
                          const monthlyTier = editedMonthlyTiers.find(t => t.priority === slotDef.slot);
                          const isEnabled = monthlyTier?.isAvailable ?? true;
                          const monthlyPrice = monthlyTier?.price ?? slotDef.defaultPrice;
                          const perks = getPerksForSlot('MONTHLY', slotDef.slot);

                          return (
                            <div
                              key={slotDef.slot}
                              className={`bg-white dark:bg-[#202020] border-2 transition-all ${
                                !isEnabled ? 'border-[#b5bcc4]/50 dark:border-[#616161]/50 opacity-50' : 'border-[#202020] dark:border-[#616161]'
                              }`}
                            >
                              <div className="px-4 py-2" style={{ backgroundColor: isEnabled ? '#ac6d46' : '#b5bcc4' }}>
                                <div className="text-xs font-bold text-white tracking-wider">{getTierLabel('MONTHLY', slotDef.slot)}</div>
                              </div>
                              <div className="p-4">
                                <div className="text-lg font-bold dark:text-[#e5e5e5] mb-1">${monthlyPrice}<span className="text-xs font-normal text-[#616161] dark:text-[#b5bcc4]">/mo</span></div>
                                {!editingTiers && monthlyTier?.membersCount ? (
                                  <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mb-2">{monthlyTier.membersCount} subscriber{monthlyTier.membersCount !== 1 ? 's' : ''}</div>
                                ) : null}
                                <div className="space-y-1 mt-2">
                                  {perks.map((perk, i) => (
                                    <div key={i} className="text-xs text-[#616161] dark:text-[#b5bcc4] flex items-start gap-1.5">
                                      <span className="text-[#598636] mt-0.5">*</span> {perk}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ONE-TIME TIERS */}
                    <div>
                      <div className="text-xs font-bold tracking-wider text-[#4676ac]">ONE-TIME TIERS</div>
                      <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mb-3">Perks cover the sponsored expedition only</div>
                      <div className="grid grid-cols-3 gap-4">
                        {ONE_TIME_TIER_SLOTS.map((slotDef) => {
                          const oneTimeTier = editedOneTimeTiers.find(t => t.priority === slotDef.slot);
                          const isEnabled = oneTimeTier?.isAvailable ?? true;
                          const perks = getPerksForSlot('ONE_TIME', slotDef.slot);

                          return (
                            <div
                              key={slotDef.slot}
                              className={`bg-white dark:bg-[#202020] border-2 transition-all ${
                                !isEnabled ? 'border-[#b5bcc4]/50 dark:border-[#616161]/50 opacity-50' : 'border-[#202020] dark:border-[#616161]'
                              }`}
                            >
                              <div className="px-4 py-2 bg-[#4676ac]" style={{ opacity: isEnabled ? 1 : 0.5 }}>
                                <div className="text-xs font-bold text-white tracking-wider">${slotDef.minPrice}+ ONE-TIME</div>
                              </div>
                              <div className="p-4">
                                {!editingTiers && oneTimeTier?.membersCount ? (
                                  <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mb-2">{oneTimeTier.membersCount} sponsor{oneTimeTier.membersCount !== 1 ? 's' : ''}</div>
                                ) : null}
                                <div className="space-y-1">
                                  {perks.map((perk, i) => (
                                    <div key={i} className="text-xs text-[#616161] dark:text-[#b5bcc4] flex items-start gap-1.5">
                                      <span className="text-[#598636] mt-0.5">*</span> {perk}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SPONSORS Tab */}
          {selectedView === 'sponsors' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                  Showing {stripePayments.length} payments
                </div>
              </div>

              {stripePayments.length === 0 ? (
                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
                  <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">No Payments Yet</h3>
                  <p className="text-[#616161] dark:text-[#b5bcc4]">
                    Complete your Stripe setup and share your expeditions to attract sponsors.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#b5bcc4] dark:bg-[#3a3a3a]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">SPONSOR</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">AMOUNT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">STATUS</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">ACTIONS</th>
                          <th className="px-4 py-3 text-center text-xs font-bold dark:text-[#e5e5e5]">DETAILS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stripePayments.map((payment) => {
                          return (
                          <React.Fragment key={payment.id}>
                          <tr className="border-t-2 border-[#b5bcc4] dark:border-[#616161]">
                            <td className="px-4 py-3 font-bold dark:text-[#e5e5e5]">
                              {payment.sponsorUsername ? (
                                <Link
                                  href={`/journal/${payment.sponsorUsername}`}
                                  className="text-[#4676ac] hover:underline"
                                >
                                  {payment.sponsorUsername}
                                </Link>
                              ) : (
                                payment.sponsorName || payment.sponsorEmail || 'Sponsor'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs font-bold ${
                                payment.sponsorshipType === 'subscription'
                                  ? 'bg-[#4676ac] text-white'
                                  : payment.sponsorshipType === 'quick_sponsor'
                                    ? 'bg-[#ac6d46] text-white'
                                    : 'bg-[#616161] text-white'
                              }`}>
                                {payment.sponsorshipType === 'subscription' ? 'RECURRING' : payment.sponsorshipType === 'quick_sponsor' ? 'QUICK-SPONSOR' : 'ONE-TIME'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-[#ac6d46]">${formatCurrency(payment.amount)}</td>
                            <td className="px-4 py-3 text-xs text-[#616161] dark:text-[#b5bcc4]">
                              {new Date(payment.created).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-bold ${
                                payment.refunded
                                  ? 'bg-[#616161] text-white'
                                  : 'bg-[#598636] text-white'
                              }`}>
                                {payment.refunded ? 'REFUNDED' : payment.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {payment.refunded ? (
                                <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">—</span>
                              ) : (
                                <button
                                  onClick={() => handleRefund(payment.id, payment.amount)}
                                  className="px-3 py-1 text-xs font-bold border-2 border-[#994040] text-[#994040] hover:bg-[#994040] hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                                >
                                  REFUND
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                                className="p-1 hover:bg-[#b5bcc4] dark:hover:bg-[#616161] transition-all dark:text-[#e5e5e5] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                              >
                                {expandedPayment === payment.id ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                          </tr>
                          {expandedPayment === payment.id && (
                            <tr className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
                              <td colSpan={7} className="p-6">
                                <div className="space-y-2 text-xs font-mono">
                                  <div className="flex justify-between">
                                    <span className="text-[#616161] dark:text-[#b5bcc4]">Transaction ID:</span>
                                    <span className="font-bold dark:text-[#e5e5e5]">{payment.id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#616161] dark:text-[#b5bcc4]">Date & Time:</span>
                                    <span className="font-bold dark:text-[#e5e5e5]">
                                      {new Date(payment.created).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#616161] dark:text-[#b5bcc4]">Type:</span>
                                    <span className="font-bold dark:text-[#e5e5e5]">
                                      {payment.sponsorshipType === 'subscription' ? 'Recurring' : payment.sponsorshipType === 'quick_sponsor' ? 'Quick-sponsor' : 'One-time'}
                                    </span>
                                  </div>
                                  {(payment.entry || payment.expedition) && (
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Source:</span>
                                      <span className="font-bold">
                                        {payment.entry && (
                                          <Link href={`/entry/${payment.entry.id}`} className="text-[#4676ac] hover:text-[#ac6d46]">
                                            {payment.entry.title}
                                          </Link>
                                        )}
                                        {payment.expedition && (
                                          <Link href={`/expedition/${payment.expedition.id}`} className="text-[#4676ac] hover:text-[#ac6d46]">
                                            {payment.expedition.title}
                                          </Link>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {payment.description && (
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Message:</span>
                                      <span className="italic dark:text-[#e5e5e5]">"{payment.description}"</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAYOUTS Tab */}
          {selectedView === 'payouts' && (
            <div className="space-y-6">
              {/* Bank Account Reference */}
              {payoutMethods.length > 0 && (
                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">PAYOUT ACCOUNT</div>
                    <div className="text-sm font-bold dark:text-[#e5e5e5]">
                      {payoutMethods[0].bankAccount?.last4
                        ? `${payoutMethods[0].bankAccount.bankName || 'Bank'} ••••${payoutMethods[0].bankAccount.last4}`
                        : payoutMethods[0].businessName || payoutMethods[0].email || 'Stripe Connect'}
                    </div>
                  </div>
                  <span className={`inline-block w-2 h-2 ${payoutMethods[0].isVerified ? 'bg-[#598636]' : 'bg-[#ac6d46]'}`} />
                </div>
              )}

              {/* Balance */}
              {balance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Available Balance</div>
                    <div className="text-3xl font-medium text-[#ac6d46]">
                      {balance.available.symbol}
                      {formatCurrency(balance.available.amount)}
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Ready for payout</div>
                  </div>
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Pending</div>
                    <div className="text-3xl font-medium dark:text-[#e5e5e5]">
                      {balance.pending.symbol}
                      {formatCurrency(balance.pending.amount)}
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Processing</div>
                  </div>
                </div>
              )}

              {/* Transfer History */}
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                <div className="bg-[#b5bcc4] dark:bg-[#3a3a3a] p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                  <h3 className="text-sm font-bold dark:text-[#e5e5e5]">TRANSFER HISTORY</h3>
                </div>
                <div className="p-4">
                  {payouts.length === 0 ? (
                    <div className="text-center py-8 text-[#616161] dark:text-[#b5bcc4]">No transfers yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {payouts.map((payout) => (
                        <div
                          key={payout.id}
                          className="flex items-center justify-between p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]"
                        >
                          <div>
                            <div className="font-bold text-lg dark:text-[#e5e5e5]">
                              {payout.currency.symbol}
                              {formatCurrency(payout.amount)}
                            </div>
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                              {new Date(payout.created).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-1 text-xs font-bold ${
                                payout.status === 'COMPLETED' ? 'bg-[#598636] text-white' : payout.status === 'REFUNDED' ? 'bg-[#994040] text-white' : 'bg-[#ac6d46] text-white'
                              }`}
                            >
                              {payout.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STRIPE CONNECT Tab */}
          {selectedView === 'stripe' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold dark:text-[#e5e5e5]">STRIPE CONNECT STATUS</h3>
                  <button
                    onClick={async () => {
                      setIsRefreshingStatus(true);
                      try {
                        const res = await payoutApi.getPayoutMethods();
                        setPayoutMethods(res.data || []);
                        toast.success('Status refreshed');
                      } catch {
                        toast.error('Failed to refresh status');
                      } finally {
                        setIsRefreshingStatus(false);
                      }
                    }}
                    disabled={isRefreshingStatus}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all dark:text-[#e5e5e5] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                    {isRefreshingStatus ? 'REFRESHING...' : 'REFRESH STATUS'}
                  </button>
                </div>

                {payoutMethods.length === 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#ac6d46]/10 dark:bg-[#ac6d46]/20 border-l-4 border-[#ac6d46]">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-[#ac6d46] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-[#ac6d46]">Not Connected</div>
                          <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                            Connect your Stripe account to start receiving sponsorships and payouts.
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleStartStripeOnboarding}
                      disabled={isStartingOnboarding}
                      className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                    >
                      {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                      START STRIPE ONBOARDING
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white ${
                        stripeStatus === 'active' ? 'bg-[#616161]'
                        : stripeStatus === 'pending_review' ? 'bg-[#4676ac]'
                        : stripeStatus === 'action_required' || stripeStatus === 'restricted' ? 'bg-[#994040]'
                        : 'bg-[#ac6d46]'
                      }`}>
                        {stripeStatus === 'active' && <CheckCircle className="w-3.5 h-3.5" />}
                        {stripeStatus === 'pending_review' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {(stripeStatus === 'action_required' || stripeStatus === 'restricted' || stripeStatus === 'onboarding_incomplete') && <AlertCircle className="w-3.5 h-3.5" />}
                        {stripeStatus === 'active' && 'ACTIVE'}
                        {stripeStatus === 'pending_review' && 'PENDING REVIEW'}
                        {stripeStatus === 'action_required' && 'ACTION REQUIRED'}
                        {stripeStatus === 'restricted' && 'RESTRICTED'}
                        {stripeStatus === 'onboarding_incomplete' && 'ONBOARDING INCOMPLETE'}
                      </span>
                    </div>

                    {/* Capabilities */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Accept Charges:</div>
                        <div className="font-bold dark:text-[#e5e5e5] flex items-center gap-1">
                          {payoutMethods[0].chargesEnabled ? (
                            <><CheckCircle className="w-4 h-4 text-[#598636]" /> Enabled</>
                          ) : (
                            <><AlertCircle className="w-4 h-4 text-[#994040]" /> Disabled</>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Receive Payouts:</div>
                        <div className="font-bold dark:text-[#e5e5e5] flex items-center gap-1">
                          {payoutMethods[0].payoutsEnabled ? (
                            <><CheckCircle className="w-4 h-4 text-[#598636]" /> Enabled</>
                          ) : (
                            <><AlertCircle className="w-4 h-4 text-[#994040]" /> Disabled</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Requirements (action_required) */}
                    {stripeStatus === 'action_required' && payoutMethods[0].requirementsCurrentlyDue && payoutMethods[0].requirementsCurrentlyDue.length > 0 && (
                      <div className="p-4 bg-[#994040]/10 dark:bg-[#994040]/20 border-l-4 border-[#994040]">
                        <div className="font-bold text-sm text-[#994040] mb-2">Requirements Due</div>
                        <ul className="text-sm text-[#616161] dark:text-[#b5bcc4] list-disc list-inside space-y-1">
                          {payoutMethods[0].requirementsCurrentlyDue.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                        <button
                          onClick={handleStartStripeOnboarding}
                          disabled={isStartingOnboarding}
                          className="mt-3 px-4 py-2 bg-[#994040] text-white text-sm font-bold hover:bg-[#7a3333] transition-all flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                        >
                          {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                          COMPLETE REQUIREMENTS
                        </button>
                      </div>
                    )}

                    {/* Pending items (pending_review) */}
                    {stripeStatus === 'pending_review' && payoutMethods[0].requirementsPending && payoutMethods[0].requirementsPending.length > 0 && (
                      <div className="p-4 bg-[#4676ac]/10 dark:bg-[#4676ac]/20 border-l-4 border-[#4676ac]">
                        <div className="font-bold text-sm text-[#4676ac] mb-2">Under Review</div>
                        <ul className="text-sm text-[#616161] dark:text-[#b5bcc4] list-disc list-inside space-y-1">
                          {payoutMethods[0].requirementsPending.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2 italic">No action needed — Stripe is reviewing your documents.</div>
                      </div>
                    )}

                    {/* Onboarding incomplete CTA */}
                    {stripeStatus === 'onboarding_incomplete' && (
                      <button
                        onClick={handleStartStripeOnboarding}
                        disabled={isStartingOnboarding}
                        className="px-4 py-2 bg-[#ac6d46] text-white text-sm font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                      >
                        {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                        CONTINUE ONBOARDING
                      </button>
                    )}

                    {/* Account Details */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#b5bcc4] dark:border-[#616161]">
                      {payoutMethods[0].businessName && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Business Name:</div>
                          <div className="font-bold dark:text-[#e5e5e5]">{payoutMethods[0].businessName}</div>
                        </div>
                      )}
                      {payoutMethods[0].country && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Country:</div>
                          <div className="font-bold dark:text-[#e5e5e5]">{payoutMethods[0].country}</div>
                        </div>
                      )}
                      {payoutMethods[0].email && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Email:</div>
                          <div className="font-bold dark:text-[#e5e5e5]">{payoutMethods[0].email}</div>
                        </div>
                      )}
                      {payoutMethods[0].currency && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Currency:</div>
                          <div className="font-bold dark:text-[#e5e5e5] uppercase">{payoutMethods[0].currency}</div>
                        </div>
                      )}
                    </div>

                    {/* Payout Schedule */}
                    {payoutMethods[0].automaticPayouts && (
                      <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs dark:text-[#b5bcc4]">
                        <strong className="dark:text-[#e5e5e5]">Payout Schedule:</strong>{' '}
                        {payoutMethods[0].automaticPayouts.enabled
                          ? `${payoutMethods[0].automaticPayouts.schedule.interval} payouts`
                          : 'Manual payouts'}
                      </div>
                    )}

                    {/* Stripe Dashboard link */}
                    {stripeStatus === 'active' && (
                      <a
                        href="https://dashboard.stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all dark:text-[#e5e5e5]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        OPEN STRIPE DASHBOARD
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
