/**
 * Sponsorship fee math — the single source of truth for API and web.
 *
 * Charges are Stripe destination charges, so the platform is the merchant of
 * record and Stripe deducts its processing fee from the platform balance. To
 * keep the full platform fee, the application fee we collect is the platform
 * fee PLUS the estimated Stripe processing fee; the explorer receives the rest.
 *
 * All amounts are integer cents.
 */

/** Heimursaga's share of each sponsorship, in percent. */
export const PLATFORM_FEE_PERCENT = 10;

/** Stripe's standard US card pricing: 2.9% + $0.30. */
export const STRIPE_FEE_PERCENT = 2.9;
const STRIPE_FEE_BASIS_POINTS = 290; // same rate, integer math
export const STRIPE_FEE_FIXED_CENTS = 30;

/** Smallest sponsorship of any kind (one-time, tip, quick, tier), in dollars. */
export const MIN_SPONSORSHIP_AMOUNT = 5;

/** Fixed quick-sponsor amount, in dollars. */
export const QUICK_SPONSOR_AMOUNT = 5;

export interface SponsorshipFeeBreakdown {
  /** What the sponsor pays. */
  amount: number;
  /** What Heimursaga keeps. */
  platformFee: number;
  /** Estimated Stripe processing fee. */
  processingFee: number;
  /** application_fee_amount sent to Stripe (platformFee + processingFee). */
  applicationFee: number;
  /** What the explorer receives. */
  explorerReceives: number;
}

/** Estimated Stripe processing fee for a charge, rounded up to the cent. */
export function estimateStripeFee(amountCents: number): number {
  if (amountCents <= 0) return 0;
  return Math.ceil((amountCents * STRIPE_FEE_BASIS_POINTS) / 10000) + STRIPE_FEE_FIXED_CENTS;
}

export function calculateSponsorshipFees(
  amountCents: number,
  platformFeePercent: number = PLATFORM_FEE_PERCENT,
): SponsorshipFeeBreakdown {
  const amount = Math.max(0, Math.round(amountCents));
  if (amount === 0) {
    return { amount: 0, platformFee: 0, processingFee: 0, applicationFee: 0, explorerReceives: 0 };
  }

  const platformFee = Math.round((amount * platformFeePercent) / 100);
  const processingFee = estimateStripeFee(amount);
  // Stripe rejects an application fee larger than the charge.
  const applicationFee = Math.min(amount, platformFee + processingFee);

  return {
    amount,
    platformFee,
    processingFee,
    applicationFee,
    explorerReceives: amount - applicationFee,
  };
}

/**
 * application_fee_percent for a recurring charge of `amountCents`. Stripe
 * accepts at most two decimals; we round up so the platform never falls short.
 */
export function applicationFeePercentFor(
  amountCents: number,
  platformFeePercent: number = PLATFORM_FEE_PERCENT,
): number {
  const { amount, applicationFee } = calculateSponsorshipFees(amountCents, platformFeePercent);
  if (amount === 0) return platformFeePercent;
  // Integer numerator keeps exact percentages exact (no float drift into ceil).
  return Math.min(100, Math.ceil((applicationFee * 10000) / amount) / 100);
}
