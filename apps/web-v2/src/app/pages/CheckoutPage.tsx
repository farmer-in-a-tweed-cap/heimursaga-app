'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { api } from '@/app/services/api';
import {
  CreditCard,
  Lock,
  Shield,
  Check,
  AlertCircle,
  ArrowLeft,
  Crown,
  Info,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key loaded from environment variable
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
if (!stripeKey) {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set');
}
const stripePromise = loadStripe(stripeKey);

interface SavedPaymentMethod {
  id: string;       // This is the public_id from the backend
  label: string;    // e.g., "VISA 4242"
  last4: string;
  isDefault: boolean;
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const billingPeriod = (searchParams.get('plan') || 'monthly') as 'monthly' | 'annual';
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email || '');

  // Saved payment methods
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | 'new'>('new');

  const monthlyPrice = 7;
  const annualPrice = 50;
  const price = billingPeriod === 'monthly' ? monthlyPrice : annualPrice;
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  // Fetch saved payment methods on mount
  useEffect(() => {
    async function fetchPaymentMethods() {
      try {
        const response = await api.get<{ results: number; data: SavedPaymentMethod[] }>('/payment-methods');
        setSavedPaymentMethods(response.data || []);
        // Auto-select default payment method if available
        const defaultMethod = response.data?.find(pm => pm.isDefault);
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod.id);
        }
      } catch (err) {
        console.error('Failed to fetch payment methods:', err);
      } finally {
        setLoadingPaymentMethods(false);
      }
    }
    fetchPaymentMethods();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Ensure we have a payment method set up
      if (selectedPaymentMethod === 'new') {
        // Using a new card - need CardElement
        if (!elements) {
          throw new Error('Payment form not ready');
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        // Create payment method from new card
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: { name, email },
        });

        if (pmError) {
          throw new Error(pmError.message);
        }

        // Save the new payment method to the user's account
        await api.post('/payment-methods', {
          stripePaymentMethodId: paymentMethod.id,
        });

        // The backend auto-sets first card as default, but if user has other cards,
        // we need to explicitly set this new one as default
        if (savedPaymentMethods.length > 0) {
          // Refetch payment methods - the new one will be first (ordered by id desc)
          const pmResponse = await api.get<{ results: number; data: SavedPaymentMethod[] }>('/payment-methods');
          const newMethod = pmResponse.data?.[0]; // Most recent is first
          if (newMethod && !newMethod.isDefault) {
            await api.post(`/payment-methods/${newMethod.id}/default`);
          }
        }
      } else {
        // Using saved payment method - ensure it's set as default
        const savedMethod = savedPaymentMethods.find(pm => pm.id === selectedPaymentMethod);
        if (!savedMethod) {
          throw new Error('Selected payment method not found');
        }

        // Set as default if not already
        if (!savedMethod.isDefault) {
          await api.post(`/payment-methods/${savedMethod.id}/default`);
        }
      }

      // Step 2: Create subscription checkout with the plan details
      const checkoutResponse = await api.post<{
        clientSecret: string | null;
        subscriptionId: string;
        isFreeSubscription?: boolean;
      }>('/plan/upgrade/checkout', {
        planId: 'explorer-pro',
        period: billingPeriod === 'monthly' ? 'month' : 'year',
      });

      // Step 3: If client secret is returned, need to confirm the payment (SCA/3D Secure)
      if (checkoutResponse.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(checkoutResponse.clientSecret);
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      router.push('/upgrade-success?plan=' + billingPeriod);

    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 dark:text-[#e5e5e5]">
          PAYMENT METHOD
        </label>

        {loadingPaymentMethods ? (
          <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">Loading payment methods...</div>
        ) : (
          <div className="space-y-3">
            {/* Saved payment methods */}
            {savedPaymentMethods.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setSelectedPaymentMethod(pm.id)}
                className={`w-full p-4 border-2 text-left transition-all ${
                  selectedPaymentMethod === pm.id
                    ? 'border-[#4676ac] bg-[#4676ac]/5'
                    : 'border-[#b5bcc4] dark:border-[#616161] hover:border-[#4676ac]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
                    <div>
                      <div className="font-bold text-sm dark:text-[#e5e5e5]">
                        {pm.label}
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        {pm.isDefault && <span className="text-[#4676ac]">Default</span>}
                      </div>
                    </div>
                  </div>
                  {selectedPaymentMethod === pm.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#4676ac]" />
                  )}
                </div>
              </button>
            ))}

            {/* Add new card option */}
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('new')}
              className={`w-full p-4 border-2 text-left transition-all ${
                selectedPaymentMethod === 'new'
                  ? 'border-[#4676ac] bg-[#4676ac]/5'
                  : 'border-[#b5bcc4] dark:border-[#616161] hover:border-[#4676ac]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
                  <div className="font-bold text-sm dark:text-[#e5e5e5]">
                    {savedPaymentMethods.length > 0 ? 'Use a different card' : 'Add a card'}
                  </div>
                </div>
                {selectedPaymentMethod === 'new' && (
                  <CheckCircle2 className="w-5 h-5 text-[#4676ac]" />
                )}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* New card entry fields - only show when 'new' is selected */}
      {selectedPaymentMethod === 'new' && (
        <>
          {/* Card holder name */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">
              CARDHOLDER NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name as shown on card"
              required={selectedPaymentMethod === 'new'}
              className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#4676ac] outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required={selectedPaymentMethod === 'new'}
              className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#4676ac] outline-none"
            />
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2">
              Receipts and billing notifications will be sent to this email
            </div>
          </div>

          {/* Card details */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">
              CARD INFORMATION
            </label>
            <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 bg-white dark:bg-[#2a2a2a]">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#202020',
                      '::placeholder': {
                        color: '#b5bcc4',
                      },
                    },
                    invalid: {
                      color: '#dc2626',
                    },
                  },
                  hidePostalCode: false,
                }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <Shield className="w-3 h-3" />
              <span>Your payment information is encrypted and secure</span>
            </div>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-600 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-red-600 mb-1">PAYMENT ERROR</div>
              <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6">
        <div className="text-sm font-bold mb-4 dark:text-[#e5e5e5]">ORDER SUMMARY</div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm dark:text-[#e5e5e5]">
            <span>Explorer Pro ({billingPeriod === 'monthly' ? 'Monthly' : 'Annual'})</span>
            <span className="font-bold font-mono">${price}.00</span>
          </div>
          {billingPeriod === 'annual' && (
            <div className="flex justify-between text-sm text-[#4676ac]">
              <span>Annual savings</span>
              <span className="font-bold font-mono">-${annualSavings}.00</span>
            </div>
          )}
          <div className="border-t-2 border-[#b5bcc4] dark:border-[#616161] pt-3 flex justify-between items-center">
            <span className="font-bold dark:text-[#e5e5e5]">Total due today</span>
            <span className="text-3xl font-bold text-[#ac6d46]">${price}.00</span>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-5 font-bold text-xl flex items-center justify-center gap-3 transition-all border-2 ${
          !stripe || isProcessing
            ? 'bg-[#b5bcc4] border-[#b5bcc4] cursor-not-allowed text-white'
            : 'bg-[#ac6d46] border-[#ac6d46] hover:bg-[#8a5738] hover:border-[#8a5738] text-white'
        }`}
      >
        <Lock className="w-6 h-6" />
        {isProcessing ? 'PROCESSING...' : `PAY $${price}.00`}
      </button>

      {/* Security notice */}
      <div className="text-center text-xs text-[#616161] dark:text-[#b5bcc4] flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" />
        <span>Payments are securely processed by Stripe. We never store your card details.</span>
      </div>
    </form>
  );
}

export function CheckoutPage() {
  const searchParams = useSearchParams();
  const billingPeriod = (searchParams.get('plan') || 'monthly') as 'monthly' | 'annual';
  const monthlyPrice = 7;
  const annualPrice = 50;
  const price = billingPeriod === 'monthly' ? monthlyPrice : annualPrice;
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  const [nextBillingDate] = useState(() => {
    return new Date(Date.now() + (billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 text-sm text-[#4676ac] hover:text-[#ac6d46] font-bold mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to plan selection
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-8 h-8 text-[#ac6d46]" />
            <h1 className="text-3xl font-bold dark:text-[#e5e5e5]">
              SECURE CHECKOUT
            </h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Complete your purchase to unlock Explorer Pro features and start receiving sponsorships
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkout form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#ac6d46] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span className="font-bold text-xl">PAYMENT DETAILS</span>
              </div>
            </div>
            
            <div className="p-6">
              <Elements stripe={stripePromise}>
                <CheckoutForm />
              </Elements>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plan details */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#4676ac] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                <span className="font-bold text-xl">SELECTED PLAN</span>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
                  EXPLORER PRO
                </div>
                <div className="text-xl font-bold dark:text-[#e5e5e5] mb-1">
                  {billingPeriod === 'monthly' ? 'Monthly Plan' : 'Annual Plan'}
                </div>
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                  {billingPeriod === 'monthly' 
                    ? 'Billed monthly. Cancel anytime.'
                    : `Save $${annualSavings}/year vs. monthly`
                  }
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-6 pb-6 border-b-2 border-[#b5bcc4] dark:border-[#616161]">
                <div className="text-4xl font-bold text-[#ac6d46]">
                  ${price}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                  /{billingPeriod === 'monthly' ? 'month' : 'year'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-3">
                  INCLUDED FEATURES
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <span className="text-sm dark:text-[#e5e5e5]">Receive sponsorships from supporters</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <span className="text-sm dark:text-[#e5e5e5]">Private messaging</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <span className="text-sm dark:text-[#e5e5e5]">Additional entry types</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <span className="text-sm dark:text-[#e5e5e5]">Up to 10 photos per entry</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
                  <span className="text-sm dark:text-[#e5e5e5]">Entry views and insights</span>
                </div>
              </div>
            </div>
          </div>

          {/* Money-back guarantee */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-[#4676ac] flex-shrink-0" />
              <div>
                <div className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">
                  7-DAY MONEY-BACK GUARANTEE
                </div>
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Not satisfied? Cancel within 7 days for a full refund. No questions asked.
                </div>
              </div>
            </div>
          </div>

          {/* Billing info */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#4676ac]" />
              <div className="text-xs font-bold dark:text-[#e5e5e5]">
                BILLING INFORMATION
              </div>
            </div>
            <div className="space-y-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="flex justify-between">
                <span>Next billing date:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {nextBillingDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Renewal:</span>
                <span className="font-bold dark:text-[#e5e5e5]">Auto-renews</span>
              </div>
              <div className="flex justify-between">
                <span>Cancellation:</span>
                <span className="font-bold dark:text-[#e5e5e5]">Anytime</span>
              </div>
            </div>
          </div>

          {/* Security badges */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">
              SECURE PAYMENT
            </div>
            <div className="space-y-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4676ac]" />
                <span>256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#4676ac]" />
                <span>PCI DSS Level 1 compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#4676ac]" />
                <span>Powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}