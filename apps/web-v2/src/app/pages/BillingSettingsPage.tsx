'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Check, AlertCircle, ArrowUpRight, Lock, DollarSign, Loader2, Plus, Trash2 } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { paymentMethodApi, payoutApi, planApi, type PaymentMethodFull, type PayoutBalance, type SubscriptionStatus } from '@/app/services/api';
import { useStripe, useElements, CardElement } from '@/app/context/StripeContext';
import { toast } from 'sonner';

export function BillingSettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const stripe = useStripe();
  const elements = useElements();

  // State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodFull[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [methodsRes, subscriptionRes] = await Promise.all([
        paymentMethodApi.getAll().catch(() => ({ results: 0, data: [] })),
        planApi.getSubscription().catch(() => ({ subscription: null })),
      ]);

      setPaymentMethods(methodsRes.data || []);
      setSubscription(subscriptionRes.subscription);

      // Fetch balance if user is pro
      if (isPro) {
        const balanceRes = await payoutApi.getBalance().catch(() => ({
          available: { amount: 0, currency: 'USD', symbol: '$' },
          pending: { amount: 0, currency: 'USD', symbol: '$' },
        }));
        setBalance(balanceRes);
      }
    } catch {
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  }, [isPro]);

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchBillingData();
    }
  }, [isAuthenticated, fetchBillingData]);

  const handleAddCard = async () => {
    if (!stripe || !elements) {
      toast.error('Stripe is not loaded');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card element not found');
      return;
    }

    setIsAddingCard(true);
    try {
      // Create setup intent
      const { clientSecret } = await paymentMethodApi.createSetupIntent();

      // Confirm card setup
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent?.payment_method) {
        // Save payment method to backend
        await paymentMethodApi.create(setupIntent.payment_method as string);
        toast.success('Payment method added successfully');
        setShowAddCard(false);
        fetchBillingData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add payment method');
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    setSettingDefaultId(paymentMethodId);
    try {
      await paymentMethodApi.setDefault(paymentMethodId);
      toast.success('Default payment method updated');
      fetchBillingData();
    } catch {
      toast.error('Failed to update default payment method');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeleteCard = async (paymentMethodId: string) => {
    setDeletingCardId(paymentMethodId);
    try {
      await paymentMethodApi.delete(paymentMethodId);
      toast.success('Payment method removed');
      fetchBillingData();
    } catch {
      toast.error('Failed to remove payment method');
    } finally {
      setDeletingCardId(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setIsCanceling(true);
    try {
      await planApi.cancelSubscription();
      toast.success('Subscription canceled. You will retain access until the end of your billing period.');
      fetchBillingData();
    } catch {
      toast.error('Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to manage billing settings. Please log in to continue.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?from=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isProAccount = isPro;

  // Loading state
  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#616161]" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              CURRENT SUBSCRIPTION
            </div>
            <div className="p-4 lg:p-6">
              {!isProAccount ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">Explorer (Free)</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
                        <div>* Create and manage expeditions</div>
                        <div>* Write unlimited journal entries</div>
                        <div>* Send sponsorships to other explorers</div>
                        <div>* Access to community features</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold whitespace-nowrap dark:text-[#e5e5e5]">$0/mo</div>
                  </div>

                  <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#4676ac] p-4">
                    <div className="text-sm font-bold mb-2 text-[#4676ac]">
                      UPGRADE TO EXPLORER PRO
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      Unlock the ability to receive sponsorships, access advanced analytics, priority support, and exclusive features.
                    </div>
                    <Link
                      href="/upgrade"
                      className="w-full px-4 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all flex items-center justify-center gap-2"
                    >
                      UPGRADE TO PRO - $29/MONTH
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-[#ac6d46]" />
                        <div className="text-xl font-bold dark:text-[#e5e5e5]">Explorer Pro</div>
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-[#4676ac]" />
                          Receive expedition sponsorships
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-[#4676ac]" />
                          Advanced analytics and insights
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-[#4676ac]" />
                          Priority support
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-[#4676ac]" />
                          Custom journal branding
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-[#4676ac]" />
                          Sponsorship dashboard
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold whitespace-nowrap dark:text-[#e5e5e5]">$29/mo</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] text-xs">
                    <div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Billing Cycle:</div>
                      <div className="font-bold font-mono dark:text-[#e5e5e5]">MONTHLY</div>
                    </div>
                    <div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Next Billing Date:</div>
                      <div className="font-bold font-mono dark:text-[#e5e5e5]">
                        {subscription?.currentPeriodEnd
                          ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Subscription Status:</div>
                      <div className={`font-bold ${subscription?.cancelAtPeriodEnd ? 'text-amber-600' : 'text-[#4676ac]'}`}>
                        {subscription?.cancelAtPeriodEnd ? 'CANCELING' : (subscription?.status?.toUpperCase() || 'ACTIVE')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Member Since:</div>
                      <div className="font-bold font-mono dark:text-[#e5e5e5]">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {subscription?.cancelAtPeriodEnd && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-amber-800 dark:text-amber-200">
                        Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                        You will retain access until then.
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <Link
                      href="/upgrade"
                      className="flex-1 px-4 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] text-xs font-bold hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-center"
                    >
                      CHANGE PLAN
                    </Link>
                    {!subscription?.cancelAtPeriodEnd && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={isCanceling}
                        className="flex-1 px-4 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-600 hover:text-red-600 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCanceling && <Loader2 className="w-3 h-3 animate-spin" />}
                        CANCEL SUBSCRIPTION
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              PAYMENT METHODS
            </div>
            <div className="p-4 lg:p-6">
              {/* Info Box */}
              <div className="mb-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">How payment methods are used:</span>
                  {' '}Your saved cards are used for Explorer Pro subscription billing and sponsoring other explorers.
                  Your default payment method will be charged automatically for recurring payments.
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#616161] dark:text-[#b5bcc4]">
                    No payment methods saved. Add a card to get started.
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between gap-4 p-4 border-2 border-[#b5bcc4] dark:border-[#616161]">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-[#616161] dark:text-[#b5bcc4]" />
                        <div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5]">
                            {method.label || 'Card'} **** {method.last4}
                            {method.isDefault && (
                              <span className="ml-2 px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          {method.expMonth && method.expYear && (
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                              Expires: {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            disabled={settingDefaultId === method.id}
                            className="px-3 py-1.5 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] disabled:opacity-50"
                          >
                            {settingDefaultId === method.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'SET DEFAULT'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCard(method.id)}
                          disabled={deletingCardId === method.id}
                          className="px-3 py-1.5 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-600 hover:text-red-600 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600 disabled:opacity-50"
                        >
                          {deletingCardId === method.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Card Form */}
              {showAddCard ? (
                <div className="border-2 border-[#4676ac] p-4 space-y-4">
                  <div className="text-sm font-bold dark:text-[#e5e5e5]">Add New Card</div>
                  <div className="p-3 border-2 border-[#b5bcc4] dark:border-[#616161] rounded bg-white dark:bg-[#2a2a2a]">
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: '14px',
                            color: '#1f2937',
                            '::placeholder': {
                              color: '#9ca3af',
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCard}
                      disabled={isAddingCard}
                      className="flex-1 px-4 py-2 bg-[#4676ac] text-white text-xs font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAddingCard && <Loader2 className="w-3 h-3 animate-spin" />}
                      SAVE CARD
                    </button>
                    <button
                      onClick={() => setShowAddCard(false)}
                      disabled={isAddingCard}
                      className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-xs font-bold hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCard(true)}
                  className="w-full px-4 py-3 bg-[#202020] dark:bg-[#4676ac] text-white text-xs font-bold hover:bg-[#4676ac] dark:hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD PAYMENT METHOD
                </button>
              )}
            </div>
          </div>

          {/* Sponsorship Earnings (Pro only) */}
          {isProAccount && balance && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#ac6d46] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                SPONSORSHIP EARNINGS
              </div>
              <div className="p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 text-center">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">Available Balance</div>
                    <div className="text-2xl font-bold text-[#ac6d46]">
                      {balance.available.symbol}{balance.available.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 text-center">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">Pending</div>
                    <div className="text-2xl font-bold dark:text-[#e5e5e5]">
                      {balance.pending.symbol}{balance.pending.amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] p-4">
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                    Sponsorships are paid out via Stripe Connect. Set up or manage your payout settings to receive funds.
                  </div>
                  <Link
                    href="/sponsorship"
                    className="block w-full px-4 py-2 bg-[#202020] dark:bg-[#4676ac] text-white text-xs font-bold hover:bg-[#4676ac] dark:hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-center"
                  >
                    MANAGE PAYOUT SETTINGS
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription Summary */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#4676ac] text-white px-4 py-3 font-bold text-sm">
              ACCOUNT STATUS
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Account Type:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{isProAccount ? 'EXPLORER PRO' : 'EXPLORER'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Status:</span>
                <span className={`font-bold ${subscription?.cancelAtPeriodEnd ? 'text-amber-600' : 'text-[#4676ac]'}`}>
                  {subscription?.cancelAtPeriodEnd ? 'CANCELING' : 'ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Monthly Cost:</span>
                <span className="font-bold dark:text-[#e5e5e5]">${isProAccount ? '29.00' : '0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Payment Methods:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{paymentMethods.length}</span>
              </div>
            </div>
          </div>

          {/* Upgrade Benefits (if free) */}
          {!isProAccount && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46]">
              <div className="bg-[#ac6d46] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" />
                PRO BENEFITS
              </div>
              <div className="p-4">
                <div className="text-xs dark:text-[#e5e5e5] space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                    <div>Receive sponsorships from supporters worldwide</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                    <div>Advanced analytics on journal performance</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                    <div>Priority email support</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                    <div>Custom journal branding options</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                    <div>Sponsorship dashboard & tools</div>
                  </div>
                </div>
                <Link
                  href="/upgrade"
                  className="block w-full px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-center"
                >
                  UPGRADE NOW
                </Link>
              </div>
            </div>
          )}

          {/* Help */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">BILLING HELP</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>* All payments processed securely via Stripe</div>
                <div>* Cancel anytime, no commitments</div>
                <div>* Invoices emailed automatically</div>
                <div>* Pro rata refunds for downgrades</div>
              </div>
              <Link
                href="/contact"
                className="block w-full mt-3 px-3 py-2 text-xs font-bold border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-center"
              >
                CONTACT SUPPORT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
