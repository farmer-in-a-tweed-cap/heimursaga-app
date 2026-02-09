/**
 * Payment & Sponsorship Types
 * TypeScript interfaces for Stripe integration
 */

// ============================================
// PLAN / SUBSCRIPTION TYPES
// ============================================

export interface Plan {
  id: string;
  slug: string;
  name: string;
  priceMonth: number;
  priceYear: number;
  discountYear: number;
  features: string[];
}

export interface Subscription {
  id: string;
  planId: string;
  planSlug: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionUpgradeCheckoutResponse {
  clientSecret: string;
  subscriptionId?: string;
}

// ============================================
// PAYMENT METHOD TYPES
// ============================================

export interface PaymentMethod {
  id: string;
  label: string;
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
}

export interface SetupIntentResponse {
  clientSecret: string;
}

// ============================================
// SPONSORSHIP TYPES
// ============================================

export type ExplorerStatus = 'PLANNING' | 'EXPLORING' | 'RESTING';

export interface ExplorerSponsorshipInfo {
  explorer: {
    id: string;
    username: string;
    name?: string;
    picture?: string;
    bio?: string;
    status: ExplorerStatus;
    stripeAccountConnected: boolean;
  };
  currentExpedition: {
    id: string;
    publicId: string;
    title: string;
    description?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    goal?: number;
    raised?: number;
    sponsorsCount?: number;
    coverImage?: string;
  } | null;
  tiers: SponsorshipTier[];
  stats: {
    totalSponsors: number;
    totalExpeditions: number;
    activeExpeditions: number;
    completedExpeditions: number;
  };
}

export interface SponsorshipTier {
  id: string;
  price: number;
  description: string;
  isAvailable: boolean;
  membersCount: number;
  priority?: number;
  creator?: {
    username: string;
    name?: string;
    picture?: string;
    bio?: string;
  };
}

export interface SponsorshipCheckoutPayload {
  sponsorshipTierId: string;
  creatorId: string; // username
  paymentMethodId: string;
  sponsorshipType: 'ONE_TIME_PAYMENT' | 'SUBSCRIPTION';
  oneTimePaymentAmount?: number;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  message?: string;
  emailDelivery?: boolean;
}

export interface SponsorshipCheckoutResponse {
  clientSecret: string;
  paymentMethodId: string;
}

export interface Sponsorship {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'EXPIRED';
  type: 'ONE_TIME_PAYMENT' | 'SUBSCRIPTION';
  amount: number;
  currency: string;
  message?: string;
  emailDeliveryEnabled: boolean;
  createdAt?: string;
  expiry?: string;
  sponsor?: {
    username: string;
    name?: string;
    picture?: string;
  };
  sponsoredExplorer?: {
    username: string;
    name?: string;
    picture?: string;
  };
  tier?: {
    id: string;
    description: string;
    price: number;
  };
}

export interface SponsorshipsResponse {
  results: number;
  data: Sponsorship[];
}

export interface SponsorshipTiersResponse {
  results: number;
  data: SponsorshipTier[];
}

// ============================================
// PAYOUT TYPES
// ============================================

export interface PayoutBalance {
  available: {
    amount: number;
    currency: string;
    symbol: string;
  };
  pending: {
    amount: number;
    currency: string;
    symbol: string;
  };
}

export interface PayoutMethod {
  id: string;
  platform: string;
  isVerified: boolean;
  stripeAccountId?: string;
  businessName?: string;
  businessType?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  currency?: string;
  automaticPayouts?: {
    enabled: boolean;
    schedule: {
      interval: 'manual' | 'daily' | 'weekly' | 'monthly';
      delayDays?: number;
    };
  };
}

export interface PayoutMethodsResponse {
  results: number;
  data: PayoutMethod[];
}

export interface Payout {
  id: string;
  amount: number;
  status: string;
  currency: {
    code: string;
    symbol: string;
  };
  created: string;
  arrival?: string;
}

export interface PayoutsResponse {
  results: number;
  data: Payout[];
}

// ============================================
// TIER MANAGEMENT TYPES (Explorer Admin)
// ============================================

export interface TierConfig {
  amount: number;
  label: string;
  enabled: boolean;
  range?: string; // For monthly tiers like "$5-$15/mo"
}

export interface UpdateTiersPayload {
  oneTimeTiers?: Array<{
    id?: string;
    price: number;
    description: string;
    isAvailable: boolean;
    priority?: number;
  }>;
  monthlyTiers?: Array<{
    id?: string;
    price: number;
    description: string;
    isAvailable: boolean;
    priority?: number;
  }>;
}

export interface ExplorerSponsorshipAdmin {
  tiers: SponsorshipTier[];
  stats: {
    totalRevenue: number;
    monthlyRecurring: number;
    totalSponsors: number;
    activeSubscriptions: number;
  };
  balance: PayoutBalance;
  stripeConnected: boolean;
  stripeAccountVerified: boolean;
}

// ============================================
// REFUND TYPES
// ============================================

export interface RefundPayload {
  sponsorshipId: string;
  reason: string;
  notes?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
}

// ============================================
// CHECKOUT TYPES
// ============================================

export interface CheckoutSessionPayload {
  planId?: string;
  billingCycle?: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  clientSecret?: string;
}

// ============================================
// STRIPE ONBOARDING TYPES
// ============================================

export interface StripeOnboardingLinkPayload {
  payoutMethodId: string;
  backUrl: string;
}

export interface StripeOnboardingLinkResponse {
  url: string;
}

export interface CreatePayoutMethodPayload {
  country: string;
}

export interface CreatePayoutMethodResponse {
  payoutMethodId: string;
}
