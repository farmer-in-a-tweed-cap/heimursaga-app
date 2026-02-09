'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { CreditCard, RefreshCw, Lock, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/app/utils/dateFormat';
import { explorerApi, expeditionApi, sponsorshipApi, paymentMethodApi, type SponsorshipTierFull, type PaymentMethodFull, type Expedition } from '@/app/services/api';
import { useStripe, useElements, CardElement } from '@/app/context/StripeContext';
import { toast } from 'sonner';

type PaymentType = 'one-time' | 'recurring';

interface ExplorerInfo {
  id: string;
  username: string;
  name?: string;
  picture?: string;
  bio?: string;
  stripeAccountConnected?: boolean;
}

export function SponsorshipPaymentPage() {
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>('one-time');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [sponsorMessage, setSponsorMessage] = useState('');
  const [namePublic, setNamePublic] = useState(true);
  const [messagePublic, setMessagePublic] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Data state
  const [explorer, setExplorer] = useState<ExplorerInfo | null>(null);
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [tiers, setTiers] = useState<SponsorshipTierFull[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodFull[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const fetchExpeditionData = useCallback(async () => {
    if (!expeditionId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch expedition details
      const expeditionData = await expeditionApi.getById(expeditionId);
      setExpedition(expeditionData);

      // Fetch explorer profile and tiers
      if (expeditionData.author?.username || expeditionData.explorer?.username) {
        const username = expeditionData.author?.username || expeditionData.explorer?.username;
        const [explorerData, tiersData] = await Promise.all([
          explorerApi.getByUsername(username!),
          sponsorshipApi.getExplorerTiers(username!).catch(() => ({ results: 0, data: [] })),
        ]);

        setExplorer({
          id: username!,
          username: username!,
          name: explorerData.name,
          picture: explorerData.picture,
          bio: explorerData.bio,
          stripeAccountConnected: explorerData.stripeAccountConnected,
        });

        setTiers(tiersData.data || []);

        // Check if user already has an active subscription to this explorer
        if (isAuthenticated) {
          try {
            const mySponsorships = await sponsorshipApi.getMySponsorships();
            const activeSubToExplorer = (mySponsorships.data || []).some(
              (s) => s.type?.toUpperCase() === 'SUBSCRIPTION' && s.status?.toUpperCase() === 'ACTIVE' &&
                s.sponsoredExplorer?.username === username
            );
            setHasActiveSubscription(activeSubToExplorer);
          } catch {
            // Non-critical, proceed without check
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load expedition information');
    } finally {
      setIsLoading(false);
    }
  }, [expeditionId, isAuthenticated]);

  // Fetch data on mount
  useEffect(() => {
    if (expeditionId) {
      fetchExpeditionData();
    }
  }, [expeditionId, fetchExpeditionData]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPaymentMethods();
    }
  }, [isAuthenticated]);

  // If active subscription detected, force back to one-time
  useEffect(() => {
    if (hasActiveSubscription && paymentType === 'recurring') {
      setPaymentType('one-time');
    }
  }, [hasActiveSubscription, paymentType]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await paymentMethodApi.getAll();
      setPaymentMethods(response.data || []);
      if (response.data?.length > 0) {
        setSelectedPaymentMethod(response.data[0].id);
        setUseNewCard(false);
      }
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    }
  };

  // Convert tiers to display format - filter by type
  const oneTimeTiers = tiers
    .filter(t => t.isAvailable && t.type === 'ONE_TIME')
    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      amount: t.price,
      label: t.description || 'Supporter',
    }));

  const recurringTiers = tiers
    .filter(t => t.isAvailable && t.type === 'MONTHLY')
    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
    .slice(0, 3)
    .map(t => ({
      id: t.id,
      amount: t.price,
      label: t.description || 'Monthly Supporter',
      range: `$${Math.max(1, t.price - 5)}-$${t.price + 10}/mo`,
    }));

  // Fallback tiers if none configured
  const defaultOneTimeTiers = [
    { id: 'default-1', amount: 25, label: 'Supporter' },
    { id: 'default-2', amount: 75, label: 'Backer' },
    { id: 'default-3', amount: 200, label: 'Sponsor' },
  ];

  const defaultRecurringTiers = [
    { id: 'default-r1', amount: 10, label: 'Monthly Supporter', range: '$5-$15/mo' },
    { id: 'default-r2', amount: 30, label: 'Monthly Backer', range: '$15-$50/mo' },
  ];

  const currentTiers = paymentType === 'one-time'
    ? (oneTimeTiers.length > 0 ? oneTimeTiers : defaultOneTimeTiers)
    : (recurringTiers.length > 0 ? recurringTiers : defaultRecurringTiers);

  // Calculate final amount
  const finalAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);
  const stripeFeePercent = 0.029;
  const stripeFeeFixed = 0.30;
  const platformFee = finalAmount > 0 ? finalAmount * 0.05 : 0;
  const stripeFee = finalAmount > 0 ? (finalAmount * stripeFeePercent) + stripeFeeFixed : 0;
  const explorerReceives = finalAmount > 0 ? finalAmount - platformFee - stripeFee : 0;

  // Calculate current and projected funding relative to goal
  const currentTotalRaised = expedition
    ? (expedition.raised || 0) + (expedition.recurringStats?.totalCommitted || 0)
    : 0;
  const goalExceeded = expedition?.goal ? currentTotalRaised > expedition.goal : false;

  // Project what this new sponsorship will add to the total
  const projectedNewContribution = (() => {
    if (finalAmount <= 0 || !expedition) return 0;
    if (paymentType === 'one-time') return finalAmount;
    // For recurring: calculate months remaining in expedition
    const now = new Date();
    const expEnd = expedition.endDate ? new Date(expedition.endDate) : null;
    if (!expEnd) return finalAmount; // can't project without end date
    const monthsRemaining = Math.max(1,
      (expEnd.getFullYear() - now.getFullYear()) * 12 +
      (expEnd.getMonth() - now.getMonth()) + 1
    );
    return finalAmount * monthsRemaining;
  })();
  const projectedTotal = currentTotalRaised + projectedNewContribution;
  const willExceedGoal = expedition?.goal ? projectedTotal > expedition.goal && !goalExceeded : false;

  // Handle payment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in to sponsor an expedition');
      router.push('/auth');
      return;
    }

    if (!agreeToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    if (finalAmount < 5) {
      toast.error('Minimum sponsorship amount is $5.00');
      return;
    }

    if (!explorer?.stripeAccountConnected) {
      toast.error('This explorer has not set up their payment account yet');
      return;
    }

    // Find the appropriate tier based on payment type
    // For custom amounts, we still need a tier for tracking but the amount can be custom
    const tierType = paymentType === 'one-time' ? 'ONE_TIME' : 'MONTHLY';
    const availableTiers = tiers.filter(t => t.isAvailable && t.type === tierType);

    // Determine which tier to use
    let selectedTier: SponsorshipTierFull | undefined;
    const isCustomAmount = customAmount && parseFloat(customAmount) > 0;

    if (isCustomAmount) {
      // For custom amounts, use the first available tier (amount will be overridden for one-time)
      // For monthly custom amounts, find a tier or use the first one
      selectedTier = availableTiers[0];
    } else if (selectedAmount) {
      // Find the tier matching the selected amount, or use first available
      selectedTier = availableTiers.find(t => t.price === selectedAmount) || availableTiers[0];
    }

    if (!selectedTier) {
      toast.error(`No ${paymentType === 'one-time' ? 'one-time' : 'monthly'} sponsorship tiers available for this explorer`);
      return;
    }

    setProcessing(true);

    try {
      let paymentMethodId: string;

      // If using a new card, create the payment method first
      if (useNewCard) {
        if (!stripe || !elements) {
          throw new Error('Stripe is not loaded');
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        // Create payment method from card element
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });

        if (pmError) {
          throw new Error(pmError.message);
        }

        if (!paymentMethod) {
          throw new Error('Failed to create payment method');
        }

        // Save payment method to backend
        const savedPm = await paymentMethodApi.create(paymentMethod.id);
        paymentMethodId = savedPm.id;
      } else {
        if (!selectedPaymentMethod) {
          throw new Error('Please select a payment method');
        }
        paymentMethodId = selectedPaymentMethod;
      }

      // Create checkout
      const checkoutResponse = await sponsorshipApi.checkout({
        sponsorshipTierId: selectedTier.id,
        creatorId: explorer!.username,
        paymentMethodId: paymentMethodId,
        sponsorshipType: paymentType === 'one-time' ? 'one_time_payment' : 'subscription',
        oneTimePaymentAmount: paymentType === 'one-time' ? finalAmount : undefined,
        customAmount: (customAmount && parseFloat(customAmount) > 0) ? finalAmount : undefined,
        billingPeriod: paymentType === 'recurring' ? 'monthly' : undefined,
        message: sponsorMessage || undefined,
        emailDelivery: emailUpdates,
        isPublic: namePublic,
        isMessagePublic: messagePublic,
      });

      // Confirm payment with Stripe
      if (!stripe) {
        throw new Error('Stripe is not loaded');
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        checkoutResponse.clientSecret,
        {
          payment_method: checkoutResponse.paymentMethodId,
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        // Complete checkout on backend (fallback for webhook)
        try {
          await sponsorshipApi.completeCheckout(paymentIntent.id);
        } catch (completeErr) {
          console.error('Failed to complete checkout:', completeErr);
          // Don't throw - the webhook may still complete it
        }

        toast.success('Sponsorship successful!');
        router.push(`/payment-success?expedition=${expedition?.publicId || expeditionId}&amount=${finalAmount}&type=${paymentType}&explorer=${explorer?.username}&paymentIntent=${paymentIntent.id}`);
      } else if (paymentIntent?.status === 'requires_action') {
        toast.info('Additional authentication required');
      } else if (paymentIntent?.status === 'requires_confirmation') {
        // For subscriptions, the payment may need an additional confirm step
        const { error: reconfirmError, paymentIntent: confirmedPI } = await stripe.confirmCardPayment(
          paymentIntent.client_secret!,
        );
        if (reconfirmError) {
          throw new Error(reconfirmError.message);
        }
        if (confirmedPI?.status === 'succeeded' || confirmedPI?.status === 'processing') {
          try {
            await sponsorshipApi.completeCheckout(confirmedPI.id);
          } catch (completeErr) {
            console.error('Failed to complete checkout:', completeErr);
          }
          toast.success('Sponsorship successful!');
          router.push(`/payment-success?expedition=${expedition?.publicId || expeditionId}&amount=${finalAmount}&type=${paymentType}&explorer=${explorer?.username}&paymentIntent=${confirmedPI.id}`);
        } else {
          throw new Error('Payment confirmation failed');
        }
      } else {
        throw new Error(`Payment was not completed (status: ${paymentIntent?.status})`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8">
          <h1 className="text-2xl font-bold mb-4 dark:text-[#e5e5e5]">Authentication Required</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">You must be logged in to sponsor an expedition.</p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all"
          >
            LOG IN / SIGN UP
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#616161]" />
        <p className="mt-4 text-[#616161] dark:text-[#b5bcc4]">Loading expedition details...</p>
      </div>
    );
  }

  // Error state
  if (error || !expedition) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="bg-white dark:bg-[#202020] border-2 border-red-500 p-8">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-4 dark:text-[#e5e5e5]">Failed to Load</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">{error || 'Expedition not found'}</p>
          <Link
            href="/expeditions"
            className="inline-block px-6 py-3 bg-[#4676ac] text-white hover:bg-[#365a87] transition-all"
          >
            BROWSE EXPEDITIONS
          </Link>
        </div>
      </div>
    );
  }

  // Check if explorer can receive sponsorships
  if (!explorer?.stripeAccountConnected) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="bg-white dark:bg-[#202020] border-2 border-amber-500 p-8">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-4 dark:text-[#e5e5e5]">Sponsorships Not Available</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
            This explorer hasn't set up their payment account yet. Sponsorships will be available once they complete their Stripe Connect setup.
          </p>
          <Link
            href={`/expedition/${expeditionId}`}
            className="inline-block px-6 py-3 bg-[#4676ac] text-white hover:bg-[#365a87] transition-all"
          >
            VIEW EXPEDITION
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-xs font-mono text-[#b5bcc4] dark:text-[#b5bcc4]">
        <Link href="/explorers" className="hover:text-[#ac6d46]">EXPLORERS</Link>
        {' > '}
        <Link href={`/journal/${explorer?.username}`} className="hover:text-[#ac6d46]">{explorer?.username}</Link>
        {' > '}
        <span className="text-[#4676ac] font-bold">SPONSOR EXPLORER</span>
      </div>

      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#ac6d46] text-white p-6 border-b-2 border-[#202020] dark:border-[#616161]">
          <h1 className="text-2xl font-bold mb-2">SPONSOR EXPLORER: {explorer?.username?.toUpperCase()}</h1>
          <p className="text-sm text-[#f5f5f5]">
            Become a sponsor of {explorer?.username}'s exploration work
          </p>
        </div>

        {/* Explorer Profile Section */}
        <div className="p-6 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-start gap-6">
            <Link href={`/journal/${explorer?.username}`} className="flex-shrink-0">
              <div className="w-24 h-24 border-4 border-[#ac6d46] overflow-hidden bg-[#616161]">
                <Image
                  src={explorer?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${explorer?.username}`}
                  alt={explorer?.username || ''}
                  className="w-full h-full object-cover"
                  width={96}
                  height={96}
                />
              </div>
            </Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">{explorer?.username}</h2>
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">{explorer?.bio || 'Explorer on Heimursaga'}</p>

              {/* Current Active Expedition */}
              <div className="bg-white dark:bg-[#202020] border-l-4 border-[#4676ac] p-4">
                <div className="text-xs font-bold mb-2 font-mono text-[#4676ac]">
                  FUNDS CURRENTLY GO TO:
                </div>
                <div className="mb-2">
                  <Link
                    href={`/expedition/${expedition.publicId || expedition.id}`}
                    className="text-lg font-bold text-[#ac6d46] hover:text-[#4676ac]"
                  >
                    {expedition.title}
                  </Link>
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  {expedition.category} {expedition.status && `- ${expedition.status}`}
                </div>
                {(expedition.goal || expedition.raised) && (
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    {expedition.startDate && (
                      <div>
                        <div className="text-[#616161] dark:text-[#b5bcc4]">Started:</div>
                        <div className="font-bold dark:text-[#e5e5e5]">{formatDate(expedition.startDate)}</div>
                      </div>
                    )}
                    {expedition.endDate && (
                      <div>
                        <div className="text-[#616161] dark:text-[#b5bcc4]">Est. End:</div>
                        <div className="font-bold dark:text-[#e5e5e5]">{formatDate(expedition.endDate)}</div>
                      </div>
                    )}
                    {expedition.goal && (
                      <div>
                        <div className="text-[#616161] dark:text-[#b5bcc4]">Progress:</div>
                        <div className="font-bold text-[#ac6d46]">
                          ${(expedition.raised || 0).toLocaleString()} / ${expedition.goal.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs">
                <div className="font-bold mb-1 dark:text-[#e5e5e5]">HOW EXPLORER-LEVEL SPONSORSHIPS WORK:</div>
                <ul className="space-y-1 text-[#616161] dark:text-[#b5bcc4]">
                  <li>* You sponsor <strong>{explorer?.username}</strong> as an explorer, not a single expedition</li>
                  <li>* Your funds support their work while PLANNING and EXPLORING</li>
                  <li>* Recurring monthly sponsorships pause when explorer is RESTING</li>
                  <li>* Cancel anytime from your dashboard - no long-term commitment</li>
                </ul>
              </div>

              {/* Goal exceeded / will exceed notice */}
              {expedition?.goal && expedition.goal > 0 && goalExceeded && (
                <div className="mt-3 p-3 bg-[#fef9e7] dark:bg-[#2a2518] border-l-4 border-[#d4a844] text-xs">
                  <div className="font-bold mb-1 text-[#d4a844]">EXPEDITION GOAL REACHED</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4]">
                    This expedition has already met its funding goal of <span className="font-bold">${expedition.goal.toLocaleString()}</span>.
                    Your sponsorship is still welcome — excess funds will be allocated to future expeditions.
                  </div>
                </div>
              )}
              {expedition?.goal && expedition.goal > 0 && !goalExceeded && willExceedGoal && finalAmount > 0 && (
                <div className="mt-3 p-3 bg-[#fef9e7] dark:bg-[#2a2518] border-l-4 border-[#d4a844] text-xs">
                  <div className="font-bold mb-1 text-[#d4a844]">
                    {paymentType === 'recurring' ? 'PROJECTED TO EXCEED GOAL' : 'WILL EXCEED GOAL'}
                  </div>
                  <div className="text-[#616161] dark:text-[#b5bcc4]">
                    This sponsorship {paymentType === 'recurring' ? 'is projected to push' : 'will push'} funding
                    {' '}<span className="font-bold">${(projectedTotal - expedition.goal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> beyond
                    the <span className="font-bold">${expedition.goal.toLocaleString()}</span> goal.
                    Excess funds will be allocated to future expeditions.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Type Selection */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h2 className="text-sm font-bold font-mono">STEP 1: CHOOSE SUPPORT TYPE</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* One-Time Payment Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('one-time');
                      setSelectedAmount(currentTiers[0]?.amount || 25);
                    }}
                    className={`p-6 border-2 transition-all ${paymentType === 'one-time'
                      ? 'border-[#ac6d46] bg-[#fff5f0] dark:bg-[#2a2a2a]'
                      : 'border-[#b5bcc4] dark:border-[#616161] hover:border-[#ac6d46]'
                      }`}
                  >
                    <div className="text-center">
                      <DollarSign className="w-12 h-12 mx-auto mb-2 text-[#202020] dark:text-[#e5e5e5]" />
                      <div className="font-bold text-lg mb-2 dark:text-[#e5e5e5]">ONE-TIME SPONSORSHIP</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">
                        Support this expedition specifically
                      </div>
                      {paymentType === 'one-time' && (
                        <div className="mt-3 px-3 py-1 bg-[#ac6d46] text-white text-xs inline-block">
                          SELECTED
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Monthly Subscription Option */}
                  <button
                    type="button"
                    disabled={hasActiveSubscription}
                    onClick={() => {
                      if (hasActiveSubscription) return;
                      setPaymentType('recurring');
                      setSelectedAmount(recurringTiers[0]?.amount || defaultRecurringTiers[0].amount);
                    }}
                    className={`p-6 border-2 transition-all ${hasActiveSubscription
                      ? 'border-[#b5bcc4] dark:border-[#616161] opacity-60 cursor-not-allowed'
                      : paymentType === 'recurring'
                        ? 'border-[#4676ac] bg-[#f0f4f8] dark:bg-[#2a2a2a]'
                        : 'border-[#b5bcc4] dark:border-[#616161] hover:border-[#4676ac]'
                      }`}
                  >
                    <div className="text-center">
                      <RefreshCw className="w-12 h-12 mx-auto mb-2 text-[#202020] dark:text-[#e5e5e5]" />
                      <div className="font-bold text-lg mb-2 dark:text-[#e5e5e5]">RECURRING MONTHLY SPONSORSHIP</div>
                      {hasActiveSubscription ? (
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">
                          You already have an active recurring sponsorship for this explorer.
                          <Link href="/sponsorship" className="text-[#4676ac] hover:underline ml-1">
                            Manage it here
                          </Link>
                        </div>
                      ) : (
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">
                          Ongoing explorer-level support
                        </div>
                      )}
                      {paymentType === 'recurring' && !hasActiveSubscription && (
                        <div className="mt-3 px-3 py-1 bg-[#4676ac] text-white text-xs inline-block">
                          SELECTED
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h2 className="text-sm font-bold">STEP 2: SELECT AMOUNT</h2>
              </div>
              <div className="p-6">
                {/* Preset Tiers */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {currentTiers.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(tier.amount);
                        setCustomAmount('');
                      }}
                      className={`p-4 border-2 transition-all text-left ${selectedAmount === tier.amount && !customAmount
                        ? 'border-[#4676ac] bg-[#f0f4f8] dark:bg-[#2a2a2a]'
                        : 'border-[#b5bcc4] dark:border-[#616161] hover:border-[#ac6d46]'
                        }`}
                    >
                      <div className="font-bold text-xl mb-1 dark:text-[#e5e5e5]">
                        ${tier.amount}
                        {paymentType === 'recurring' && <span className="text-sm">/mo</span>}
                      </div>
                      <div className="text-xs font-bold text-[#ac6d46]">{tier.label}</div>
                      {'range' in tier && typeof tier.range === 'string' && (
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono mt-1">
                          {tier.range}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">
                    CUSTOM AMOUNT {paymentType === 'recurring' && '(per month)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold dark:text-[#e5e5e5]">$</span>
                    <input
                      type="number"
                      min="5"
                      max="10000"
                      step="1"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      placeholder="Enter custom amount"
                      className="flex-1 px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-xl font-bold bg-white dark:bg-[#202020] dark:text-[#e5e5e5]"
                    />
                    {paymentType === 'recurring' && (
                      <span className="text-xl font-bold text-[#616161] dark:text-[#b5bcc4]">/month</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Minimum amount: $5.00 - Maximum: $10,000.00
                  </div>
                </div>

                {/* Sponsor Benefits */}
                <div className="mt-6 p-4 bg-[#f0f8ff] dark:bg-[#1a2a3a] border-2 border-[#4676ac]">
                  <div className="font-bold text-sm mb-2 text-[#4676ac]">ALL SPONSORS RECEIVE:</div>
                  <ul className="text-xs space-y-1 text-[#202020] dark:text-[#e5e5e5]">
                    <li>* Access to sponsor-only journal entries</li>
                    <li>* Access to sponsor-only Expedition Notes</li>
                    <li>* Recognition on expedition sponsorship leaderboard</li>
                    <li>* Direct connection with the explorer</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sponsor Information */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h2 className="text-sm font-bold">STEP 3: SPONSOR INFORMATION</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium dark:text-[#e5e5e5]">
                      SPONSORING AS
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={namePublic}
                        onChange={(e) => setNamePublic(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="dark:text-[#b5bcc4]">Show publicly</span>
                    </label>
                  </div>
                  <div className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] font-bold">
                    {user?.username}
                  </div>
                  {!namePublic && (
                    <div className="mt-1 text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Your name will be shown as "Anonymous" publicly
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium dark:text-[#e5e5e5]">
                      MESSAGE TO EXPLORER (Optional)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={messagePublic}
                        onChange={(e) => setMessagePublic(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="dark:text-[#b5bcc4]">Show publicly</span>
                    </label>
                  </div>
                  <textarea
                    value={sponsorMessage}
                    onChange={(e) => setSponsorMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Leave an encouraging message..."
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm bg-white dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <span>{sponsorMessage.length} / 500 characters</span>
                    {!messagePublic && sponsorMessage && (
                      <span>Message visible only to explorer</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#b5bcc4] dark:border-[#616161]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailUpdates}
                      onChange={(e) => setEmailUpdates(e.target.checked)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-bold dark:text-[#e5e5e5]">Receive expedition updates</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Get email notifications when new journal entries are posted
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h2 className="text-sm font-bold">STEP 4: PAYMENT METHOD</h2>
              </div>
              <div className="p-6">
                {/* Saved Cards */}
                {paymentMethods.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">SAVED CARDS</label>
                    {paymentMethods.map((pm) => (
                      <label key={pm.id} className="flex items-center gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#616161] cursor-pointer hover:border-[#ac6d46]">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selectedPaymentMethod === pm.id && !useNewCard}
                          onChange={() => {
                            setSelectedPaymentMethod(pm.id);
                            setUseNewCard(false);
                          }}
                          className="w-4 h-4"
                        />
                        <CreditCard className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
                        <span className="dark:text-[#e5e5e5]">{pm.label || 'Card'} **** {pm.last4}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#616161] cursor-pointer hover:border-[#ac6d46]">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={useNewCard}
                        onChange={() => setUseNewCard(true)}
                        className="w-4 h-4"
                      />
                      <span className="dark:text-[#e5e5e5]">Use a new card</span>
                    </label>
                  </div>
                )}

                {/* New Card Form */}
                {(useNewCard || paymentMethods.length === 0) && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">CARD DETAILS</label>
                    <div className="p-4 border-2 border-[#b5bcc4] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] rounded">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#1f2937',
                              '::placeholder': {
                                color: '#9ca3af',
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4] flex items-center gap-2">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>Your payment is processed securely via Stripe. We never store your card details.</span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    required
                    className="mt-1 w-5 h-5"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-bold mb-1 dark:text-[#e5e5e5]">
                      I agree to the terms and conditions <span className="text-[#ac6d46]">*</span>
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                      <p>* I understand this is a sponsorship, not a purchase or investment</p>
                      <p>* No goods or services are guaranteed</p>
                      <p className="text-[#ac6d46]">* Refunds are at the explorer's discretion</p>
                      {paymentType === 'recurring' && (
                        <p>* Recurring payments support the explorer across multiple expeditions</p>
                      )}
                      <p>* I have read the <Link href="/legal/terms" className="text-[#4676ac] hover:underline">full terms</Link> and <Link href="/legal/privacy" className="text-[#4676ac] hover:underline">privacy policy</Link></p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing || !agreeToTerms || finalAmount < 5}
              className="w-full py-4 bg-[#ac6d46] text-white text-lg font-bold hover:bg-[#8a5738] transition-all disabled:bg-[#b5bcc4] disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  PROCESSING PAYMENT...
                </>
              ) : (
                <>
                  {paymentType === 'one-time' ? (
                    <><CreditCard className="w-5 h-5" /> COMPLETE PAYMENT</>
                  ) : (
                    <><RefreshCw className="w-5 h-5" /> START MONTHLY SPONSORSHIP</>
                  )}
                  {' - '}${finalAmount.toFixed(2)}
                  {paymentType === 'recurring' && '/month'}
                </>
              )}
            </button>
          </div>

          {/* Right Sidebar - Summary */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] sticky top-6">
              <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h2 className="text-sm font-bold">PAYMENT SUMMARY</h2>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Payment Type:</span>
                  <span className="font-bold dark:text-[#e5e5e5]">
                    {paymentType === 'one-time' ? 'One-Time' : 'Monthly Recurring'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Amount:</span>
                  <span className="font-bold text-lg dark:text-[#e5e5e5]">
                    ${finalAmount.toFixed(2)}
                    {paymentType === 'recurring' && <span className="text-sm">/mo</span>}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#b5bcc4] dark:border-[#616161] space-y-2 text-xs font-mono">
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">FEE BREAKDOWN:</div>

                  <div className="flex justify-between">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Your contribution:</span>
                    <span className="font-bold dark:text-[#e5e5e5]">${finalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Platform fee (5%):</span>
                    <span className="text-[#ac6d46]">-${platformFee.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Stripe fee (2.9% + $0.30):</span>
                    <span className="text-[#ac6d46]">-${stripeFee.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-[#b5bcc4] dark:border-[#616161] flex justify-between font-bold">
                    <span className="dark:text-[#e5e5e5]">Explorer receives:</span>
                    <span className="text-[#ac6d46] text-base">${explorerReceives.toFixed(2)}</span>
                  </div>
                </div>

                {paymentType === 'recurring' && (
                  <div className="pt-3 border-t border-[#b5bcc4] dark:border-[#616161]">
                    <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">RECURRING DETAILS:</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                      <p>* First charge: Today</p>
                      <p>* Next charge: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                      <p>* Cancel anytime from dashboard</p>
                      <p>* Pauses when explorer is resting</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 text-xs">
              <div className="font-bold mb-2 flex items-center gap-2 dark:text-[#e5e5e5]">
                <Lock className="w-4 h-4" />
                SECURITY & PRIVACY
              </div>
              <div className="space-y-2 text-[#616161] dark:text-[#b5bcc4]">
                <p>* PCI-DSS compliant via Stripe</p>
                <p>* 256-bit SSL encryption</p>
                <p>* No card details stored</p>
                <p>* 3D Secure supported</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
