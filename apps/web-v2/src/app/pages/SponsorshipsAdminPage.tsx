'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import {
  DollarSign,
  TrendingUp,
  Users,
  Edit,
  Save,
  AlertCircle,
  CheckCircle,
  Calendar,
  HandHeart,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  X,
  ChevronDown,
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
import {
  ONE_TIME_TIER_SLOTS,
  MONTHLY_TIER_SLOTS,
  getTierSlotConfig,
  isValidTierPrice,
} from '@repo/types';

type ViewType = 'overview' | 'tiers' | 'sponsors' | 'refunds' | 'payouts' | 'stripe';

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
  }>>([]);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);

  // Country selector modal state
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('US');

  // Refund confirmation modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<{ chargeId: string; amount: number } | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

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

      // Separate tiers by type
      const oneTimeTiers = (tiersRes.data || [])
        .filter(t => t.type === 'ONE_TIME')
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .map((t, i) => ({
          id: t.id,
          price: t.price,
          description: t.description,
          isAvailable: t.isAvailable,
          priority: t.priority || i + 1,
          membersCount: t.membersCount,
        }));

      const monthlyTiers = (tiersRes.data || [])
        .filter(t => t.type === 'MONTHLY')
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .map((t, i) => ({
          id: t.id,
          price: t.price,
          description: t.description,
          isAvailable: t.isAvailable,
          priority: t.priority || i + 1,
          membersCount: t.membersCount,
        }));

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
    // Validate prices before saving
    for (const tier of editedOneTimeTiers) {
      if (!isValidTierPrice('ONE_TIME', tier.priority, tier.price)) {
        const config = getTierSlotConfig('ONE_TIME', tier.priority);
        const maxText = config?.maxPrice ? `$${config.maxPrice}` : 'unlimited';
        toast.error(`${config?.label || 'Tier'}: Price must be between $${config?.minPrice} and ${maxText}`);
        return;
      }
    }

    for (const tier of editedMonthlyTiers) {
      if (!isValidTierPrice('MONTHLY', tier.priority, tier.price)) {
        const config = getTierSlotConfig('MONTHLY', tier.priority);
        const maxText = config?.maxPrice ? `$${config.maxPrice}` : 'unlimited';
        toast.error(`${config?.label || 'Tier'}: Price must be between $${config?.minPrice} and ${maxText}`);
        return;
      }
    }

    setIsSavingTiers(true);
    try {
      // Save one-time tiers
      for (const tier of editedOneTimeTiers) {
        if (tier.id) {
          await sponsorshipApi.updateTier(tier.id, {
            price: tier.price,
            description: tier.description,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        } else {
          await sponsorshipApi.createTier({
            type: 'ONE_TIME',
            price: tier.price,
            description: tier.description,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        }
      }

      // Save monthly tiers
      for (const tier of editedMonthlyTiers) {
        if (tier.id) {
          await sponsorshipApi.updateTier(tier.id, {
            price: tier.price,
            description: tier.description,
            isAvailable: tier.isAvailable,
            priority: tier.priority,
          });
        } else {
          await sponsorshipApi.createTier({
            type: 'MONTHLY',
            price: tier.price,
            description: tier.description,
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

  const handleDeleteTier = (tierId: string) => {
    setDeleteTierTarget(tierId);
    setShowDeleteTierModal(true);
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

  const handleAddOneTimeTier = () => {
    if (editedOneTimeTiers.length >= ONE_TIME_TIER_SLOTS.length) {
      toast.error(`Maximum ${ONE_TIME_TIER_SLOTS.length} one-time tiers allowed`);
      return;
    }

    // Find the next available slot
    const usedSlots = new Set(editedOneTimeTiers.map(t => t.priority));
    const nextSlot = ONE_TIME_TIER_SLOTS.find(s => !usedSlots.has(s.slot));

    if (!nextSlot) {
      toast.error('All one-time tier slots are already in use');
      return;
    }

    setEditedOneTimeTiers([
      ...editedOneTimeTiers,
      {
        price: nextSlot.defaultPrice,
        description: nextSlot.label,
        isAvailable: false,
        priority: nextSlot.slot,
      },
    ].sort((a, b) => a.priority - b.priority));
  };

  const handleAddMonthlyTier = () => {
    if (editedMonthlyTiers.length >= MONTHLY_TIER_SLOTS.length) {
      toast.error(`Maximum ${MONTHLY_TIER_SLOTS.length} monthly tiers allowed`);
      return;
    }

    // Find the next available slot
    const usedSlots = new Set(editedMonthlyTiers.map(t => t.priority));
    const nextSlot = MONTHLY_TIER_SLOTS.find(s => !usedSlots.has(s.slot));

    if (!nextSlot) {
      toast.error('All monthly tier slots are already in use');
      return;
    }

    setEditedMonthlyTiers([
      ...editedMonthlyTiers,
      {
        price: nextSlot.defaultPrice,
        description: nextSlot.label,
        isAvailable: false,
        priority: nextSlot.slot,
      },
    ].sort((a, b) => a.priority - b.priority));
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
        backUrl: window.location.href,
      });

      // Validate Stripe redirect URL before navigating
      try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith('stripe.com')) {
          throw new Error('Invalid onboarding URL');
        }
        window.location.href = url;
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
  const stripeAccountId = payoutMethods[0]?.stripeAccountId;

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
            className="inline-block px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all"
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
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all"
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
              <div className="p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Note:</strong> You cannot change your country after setup. Make sure to select the correct country.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCountryModal(false)}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5]"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => proceedWithOnboarding()}
                  disabled={isStartingOnboarding}
                  className="flex-1 py-3 bg-[#ac6d46] text-white font-bold text-sm hover:bg-[#8a5738] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                Are you sure you want to refund <strong className="text-[#ac6d46]">${refundTarget.amount.toFixed(2)}</strong>?
              </p>
              <div className="p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-red-500 text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Warning:</strong> This action cannot be undone. The full amount will be returned to the sponsor.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundTarget(null);
                  }}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5]"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmRefund}
                  disabled={isProcessingRefund}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                Are you sure you want to delete this sponsorship tier?
              </p>
              <div className="p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Note:</strong> Existing sponsors on this tier will not be affected, but new sponsors will not be able to select it.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteTierModal(false);
                    setDeleteTierTarget(null);
                  }}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5]"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeleteTier}
                  disabled={isDeletingTier}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeletingTier && <Loader2 className="w-4 h-4 animate-spin" />}
                  DELETE TIER
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
          <div className="text-3xl font-bold text-[#ac6d46]">${totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">All-time</div>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#616161]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">MONTHLY RECURRING</div>
          </div>
          <div className="text-3xl font-bold dark:text-[#e5e5e5]">${monthlyRecurring.toFixed(2)}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">{activeSubscribers} subscribers</div>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#616161]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">TOTAL SPONSORS</div>
          </div>
          <div className="text-3xl font-bold dark:text-[#e5e5e5]">{totalSponsors}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Lifetime</div>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[#616161]" />
            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">AVAILABLE</div>
          </div>
          <div className="text-2xl font-bold dark:text-[#e5e5e5]">
            {balance?.available.symbol}
            {(balance?.available.amount || 0).toFixed(2)}
          </div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Ready for payout</div>
        </div>
      </div>

      {/* Stripe Connect Onboarding Notice */}
      {!stripeConnected && (
        <div className="bg-[#ac6d46] text-white border-2 border-[#ac6d46] mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-xl mb-2">ACTION REQUIRED: Complete Stripe Connect Onboarding</div>
                <div className="text-sm mb-4 opacity-90">
                  To receive sponsorships and payouts, you must connect your Stripe account. This secure process links
                  your bank account for direct deposits.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleStartStripeOnboarding}
                    disabled={isStartingOnboarding}
                    className="px-6 py-3 bg-white text-[#ac6d46] font-bold hover:bg-[#f5f5f5] transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                    START STRIPE ONBOARDING
                  </button>
                  <button
                    onClick={() => setSelectedView('stripe')}
                    className="px-6 py-3 border-2 border-white text-white font-bold hover:bg-white hover:text-[#ac6d46] transition-all text-sm"
                  >
                    VIEW DETAILS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connected Notice */}
      {stripeConnected && (
        <div className="bg-[#616161] text-white border-2 border-[#616161] mb-6 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div className="flex-1 text-sm font-bold">Stripe Connected - Ready to receive sponsorships</div>
            <button onClick={() => setSelectedView('stripe')} className="text-xs text-white opacity-90 hover:opacity-100 font-bold">
              MANAGE
            </button>
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
              } transition-all`}
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
                  <h3 className="text-sm font-bold dark:text-[#e5e5e5]">RECENT PAYMENTS (FROM STRIPE)</h3>
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
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                              {new Date(payment.created).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${payment.refunded ? 'text-gray-500 line-through' : 'text-[#ac6d46]'}`}>
                              ${payment.amount.toFixed(2)}
                            </div>
                            <div className="text-xs">
                              <span className={`px-2 py-0.5 text-xs font-bold ${
                                payment.refunded ? 'bg-gray-500' : 'bg-green-600'
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
                    className="w-full mt-4 py-2 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#202020] hover:text-white dark:hover:bg-[#616161] transition-all dark:text-[#e5e5e5]"
                  >
                    VIEW ALL PAYMENTS
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedView('tiers')}
                  className="p-4 border-2 border-[#ac6d46] hover:bg-[#ac6d46] hover:text-white transition-all font-bold dark:text-[#e5e5e5]"
                >
                  MANAGE TIERS
                </button>
                <button
                  onClick={() => setSelectedView('payouts')}
                  className="p-4 border-2 border-[#4676ac] hover:bg-[#4676ac] hover:text-white transition-all font-bold dark:text-[#e5e5e5]"
                >
                  VIEW PAYOUTS
                </button>
                <Link
                  href={`/journal/${user?.username}`}
                  className="p-4 border-2 border-[#202020] dark:border-[#616161] hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all font-bold dark:text-[#e5e5e5] text-center"
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
                  Configure your sponsorship tiers for one-time and monthly recurring sponsorships.
                </div>
                <div className="flex gap-2">
                  {editingTiers ? (
                    <>
                      <button
                        onClick={handleSaveTiers}
                        disabled={isSavingTiers}
                        className="px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSavingTiers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
                        className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-xs font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all dark:text-[#e5e5e5]"
                      >
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingTiers(true)}
                      className="px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> EDIT TIERS
                    </button>
                  )}
                </div>
              </div>

              {/* ONE-TIME TIERS SECTION */}
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                  <h3 className="text-sm font-bold">ONE-TIME SPONSORSHIP TIERS (Max 5)</h3>
                  <p className="text-xs mt-1 opacity-90">Single contributions to support your current expedition</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {editedOneTimeTiers.map((tier, index) => {
                      const slotConfig = getTierSlotConfig('ONE_TIME', tier.priority);
                      const priceRangeText = slotConfig
                        ? `$${slotConfig.minPrice} - ${slotConfig.maxPrice ? `$${slotConfig.maxPrice}` : 'unlimited'}`
                        : '';
                      const isPriceValid = slotConfig
                        ? isValidTierPrice('ONE_TIME', tier.priority, tier.price)
                        : true;

                      return (
                        <div
                          key={tier.id || `onetime-${index}`}
                          className={`flex items-center gap-4 p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 ${
                            !isPriceValid && editingTiers
                              ? 'border-red-400 dark:border-red-500'
                              : 'border-[#b5bcc4] dark:border-[#616161]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={tier.isAvailable}
                            disabled={!editingTiers}
                            onChange={(e) => {
                              const updated = [...editedOneTimeTiers];
                              updated[index].isAvailable = e.target.checked;
                              setEditedOneTimeTiers(updated);
                            }}
                            className="w-5 h-5"
                            title="Enable/disable tier"
                          />
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                                AMOUNT ({priceRangeText})
                              </label>
                              <input
                                type="number"
                                min={slotConfig?.minPrice || 1}
                                max={slotConfig?.maxPrice || undefined}
                                value={tier.price}
                                disabled={!editingTiers}
                                onChange={(e) => {
                                  const updated = [...editedOneTimeTiers];
                                  updated[index].price = parseFloat(e.target.value) || 0;
                                  setEditedOneTimeTiers(updated);
                                }}
                                className={`w-full px-3 py-2 border-2 dark:bg-[#202020] dark:text-[#e5e5e5] disabled:bg-[#f5f5f5] dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed ${
                                  !isPriceValid && editingTiers
                                    ? 'border-red-400 dark:border-red-500'
                                    : 'border-[#b5bcc4] dark:border-[#616161]'
                                }`}
                              />
                              {!isPriceValid && editingTiers && (
                                <p className="text-xs text-red-500 mt-1">Price out of range</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">LABEL</label>
                              <input
                                type="text"
                                value={tier.description}
                                disabled={!editingTiers}
                                onChange={(e) => {
                                  const updated = [...editedOneTimeTiers];
                                  updated[index].description = e.target.value;
                                  setEditedOneTimeTiers(updated);
                                }}
                                className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#202020] dark:text-[#e5e5e5] disabled:bg-[#f5f5f5] dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                          {editingTiers && tier.id && (
                            <button
                              onClick={() => handleDeleteTier(tier.id!)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                          {tier.membersCount !== undefined && tier.membersCount > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-bold text-[#4676ac]">{tier.membersCount}</div>
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">sponsors</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {editingTiers && editedOneTimeTiers.length < ONE_TIME_TIER_SLOTS.length && (
                    <button
                      onClick={handleAddOneTimeTier}
                      className="w-full mt-4 py-3 border-2 border-dashed border-[#b5bcc4] dark:border-[#616161] font-bold text-sm hover:border-[#4676ac] hover:text-[#4676ac] transition-all flex items-center justify-center gap-2 dark:text-[#e5e5e5]"
                    >
                      <Plus className="w-4 h-4" /> ADD ONE-TIME TIER
                    </button>
                  )}
                  {editedOneTimeTiers.length === 0 && !editingTiers && (
                    <div className="text-center py-6 text-[#616161] dark:text-[#b5bcc4]">
                      No one-time tiers configured. Click "Edit Tiers" to add some.
                    </div>
                  )}
                </div>
              </div>

              {/* MONTHLY TIERS SECTION */}
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                  <h3 className="text-sm font-bold">MONTHLY SUBSCRIPTION TIERS (Max 3)</h3>
                  <p className="text-xs mt-1 opacity-90">Recurring support that follows you across all expeditions</p>
                </div>
                <div className="p-6">
                  <div className="mb-4 p-4 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs dark:text-[#b5bcc4]">
                    <strong className="dark:text-[#e5e5e5]">Monthly billing info:</strong> Subscriptions automatically pause when you're RESTING
                    (no active expeditions) and resume when you start a new expedition. Auto-cancels after 90 days of rest.
                  </div>
                  <div className="space-y-3">
                    {editedMonthlyTiers.map((tier, index) => {
                      const slotConfig = getTierSlotConfig('MONTHLY', tier.priority);
                      const priceRangeText = slotConfig
                        ? `$${slotConfig.minPrice} - ${slotConfig.maxPrice ? `$${slotConfig.maxPrice}` : 'unlimited'}/mo`
                        : '';
                      const isPriceValid = slotConfig
                        ? isValidTierPrice('MONTHLY', tier.priority, tier.price)
                        : true;

                      return (
                        <div
                          key={tier.id || `monthly-${index}`}
                          className={`flex items-center gap-4 p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 ${
                            !isPriceValid && editingTiers
                              ? 'border-red-400 dark:border-red-500'
                              : 'border-[#b5bcc4] dark:border-[#616161]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={tier.isAvailable}
                            disabled={!editingTiers}
                            onChange={(e) => {
                              const updated = [...editedMonthlyTiers];
                              updated[index].isAvailable = e.target.checked;
                              setEditedMonthlyTiers(updated);
                            }}
                            className="w-5 h-5"
                            title="Enable/disable tier"
                          />
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                                AMOUNT ({priceRangeText})
                              </label>
                              <input
                                type="number"
                                min={slotConfig?.minPrice || 1}
                                max={slotConfig?.maxPrice || undefined}
                                value={tier.price}
                                disabled={!editingTiers}
                                onChange={(e) => {
                                  const updated = [...editedMonthlyTiers];
                                  updated[index].price = parseFloat(e.target.value) || 0;
                                  setEditedMonthlyTiers(updated);
                                }}
                                className={`w-full px-3 py-2 border-2 dark:bg-[#202020] dark:text-[#e5e5e5] disabled:bg-[#f5f5f5] dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed ${
                                  !isPriceValid && editingTiers
                                    ? 'border-red-400 dark:border-red-500'
                                    : 'border-[#b5bcc4] dark:border-[#616161]'
                                }`}
                              />
                              {!isPriceValid && editingTiers && (
                                <p className="text-xs text-red-500 mt-1">Price out of range</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">LABEL</label>
                              <input
                                type="text"
                                value={tier.description}
                                disabled={!editingTiers}
                                onChange={(e) => {
                                  const updated = [...editedMonthlyTiers];
                                  updated[index].description = e.target.value;
                                  setEditedMonthlyTiers(updated);
                                }}
                                className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#202020] dark:text-[#e5e5e5] disabled:bg-[#f5f5f5] dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                          {editingTiers && tier.id && (
                            <button
                              onClick={() => handleDeleteTier(tier.id!)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                          {tier.membersCount !== undefined && tier.membersCount > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-bold text-[#ac6d46]">{tier.membersCount}</div>
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">subscribers</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {editingTiers && editedMonthlyTiers.length < MONTHLY_TIER_SLOTS.length && (
                    <button
                      onClick={handleAddMonthlyTier}
                      className="w-full mt-4 py-3 border-2 border-dashed border-[#b5bcc4] dark:border-[#616161] font-bold text-sm hover:border-[#ac6d46] hover:text-[#ac6d46] transition-all flex items-center justify-center gap-2 dark:text-[#e5e5e5]"
                    >
                      <Plus className="w-4 h-4" /> ADD MONTHLY TIER
                    </button>
                  )}
                  {editedMonthlyTiers.length === 0 && !editingTiers && (
                    <div className="text-center py-6 text-[#616161] dark:text-[#b5bcc4]">
                      No monthly tiers configured. Click "Edit Tiers" to add some.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SPONSORS Tab */}
          {selectedView === 'sponsors' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                  Showing {stripePayments.length} payments from Stripe
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
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">STRIPE ID</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">AMOUNT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">STATUS</th>
                          <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stripePayments.map((payment) => (
                          <tr key={payment.id} className="border-t-2 border-[#b5bcc4] dark:border-[#616161]">
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
                            <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                              {payment.id.substring(0, 20)}...
                            </td>
                            <td className="px-4 py-3 font-bold text-[#ac6d46]">${payment.amount.toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs text-[#616161] dark:text-[#b5bcc4]">
                              {new Date(payment.created).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-bold ${
                                payment.refunded
                                  ? 'bg-gray-500 text-white'
                                  : 'bg-green-600 text-white'
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
                                  className="px-3 py-1 text-xs font-bold border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  REFUND
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
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
              {/* Balance */}
              {balance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Available Balance</div>
                    <div className="text-3xl font-bold text-[#ac6d46]">
                      {balance.available.symbol}
                      {balance.available.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Ready for payout</div>
                  </div>
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Pending</div>
                    <div className="text-3xl font-bold dark:text-[#e5e5e5]">
                      {balance.pending.symbol}
                      {balance.pending.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Processing</div>
                  </div>
                </div>
              )}

              {/* Payout History */}
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                <div className="bg-[#b5bcc4] dark:bg-[#3a3a3a] p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                  <h3 className="text-sm font-bold dark:text-[#e5e5e5]">PAYOUT HISTORY</h3>
                </div>
                <div className="p-4">
                  {payouts.length === 0 ? (
                    <div className="text-center py-8 text-[#616161] dark:text-[#b5bcc4]">No payouts yet.</div>
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
                              {payout.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                              {new Date(payout.created).toLocaleDateString()}
                              {payout.arrival && ` - Arrives ${new Date(payout.arrival).toLocaleDateString()}`}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-1 text-xs font-bold ${
                                payout.status === 'paid' ? 'bg-[#4676ac] text-white' : 'bg-[#ac6d46] text-white'
                              }`}
                            >
                              {payout.status.toUpperCase()}
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
                <h3 className="text-sm font-bold mb-4 dark:text-[#e5e5e5]">STRIPE CONNECT STATUS</h3>

                {payoutMethods.length === 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-800 dark:text-amber-200">Not Connected</div>
                          <div className="text-sm text-amber-700 dark:text-amber-300">
                            Connect your Stripe account to start receiving sponsorships and payouts.
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleStartStripeOnboarding}
                      disabled={isStartingOnboarding}
                      className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                      START STRIPE ONBOARDING
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Status:</div>
                        <div className="font-bold dark:text-[#e5e5e5]">
                          {payoutMethods[0].isVerified ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Verified
                            </span>
                          ) : (
                            <span className="text-amber-600">Pending Verification</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Account ID:</div>
                        <div className="font-bold font-mono text-sm dark:text-[#e5e5e5]">
                          {stripeAccountId || 'N/A'}
                        </div>
                      </div>
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
                    </div>

                    {!payoutMethods[0].isVerified && (
                      <button
                        onClick={handleStartStripeOnboarding}
                        disabled={isStartingOnboarding}
                        className="px-4 py-2 bg-[#4676ac] text-white text-sm font-bold hover:bg-[#365a87] transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isStartingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                        CONTINUE ONBOARDING
                      </button>
                    )}

                    {payoutMethods[0].isVerified && (
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

                    {payoutMethods[0].automaticPayouts && (
                      <div className="p-4 bg-[#f0f4f8] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs dark:text-[#b5bcc4]">
                        <strong className="dark:text-[#e5e5e5]">Payout Schedule:</strong>{' '}
                        {payoutMethods[0].automaticPayouts.enabled
                          ? `${payoutMethods[0].automaticPayouts.schedule.interval} payouts`
                          : 'Manual payouts'}
                      </div>
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
