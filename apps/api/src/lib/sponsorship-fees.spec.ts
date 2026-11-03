import {
  PLATFORM_FEE_PERCENT,
  applicationFeePercentFor,
  calculateSponsorshipFees,
  estimateStripeFee,
} from '@repo/types';

// What Stripe actually takes from the platform on a destination charge:
// 2.9% + $0.30 processing, plus Connect's 0.25% payout volume fee.
const actualStripeCost = (amountCents: number) =>
  Math.round(amountCents * 0.029 + 30) + Math.round(amountCents * 0.0025);

describe('sponsorship fees', () => {
  describe.each([500, 2500, 10000])('at %i cents', (amount) => {
    it('platform net is >= 0 after Stripe fees (one-time)', () => {
      const fees = calculateSponsorshipFees(amount);
      const net = fees.applicationFee - actualStripeCost(amount);
      expect(net).toBeGreaterThanOrEqual(0);
    });

    it('platform keeps its full fee from processing (one-time)', () => {
      const fees = calculateSponsorshipFees(amount);
      const processingNet = fees.applicationFee - estimateStripeFee(amount);
      expect(processingNet).toBe(Math.round(amount * PLATFORM_FEE_PERCENT) / 100);
    });

    it('platform net is >= 0 after Stripe fees (recurring percent)', () => {
      const percent = applicationFeePercentFor(amount);
      // Stripe computes the fee from the percent and rounds down to the cent.
      const collected = Math.floor((amount * percent) / 100);
      expect(collected - actualStripeCost(amount)).toBeGreaterThanOrEqual(0);
      expect(collected).toBeGreaterThanOrEqual(
        calculateSponsorshipFees(amount).applicationFee,
      );
    });

    it('parts add up to the amount charged', () => {
      const f = calculateSponsorshipFees(amount);
      expect(f.platformFee + f.processingFee + f.explorerReceives).toBe(
        f.amount,
      );
      expect(f.applicationFee).toBe(f.platformFee + f.processingFee);
    });
  });

  it('matches the worked example at $25', () => {
    expect(calculateSponsorshipFees(2500)).toEqual({
      amount: 2500,
      platformFee: 250,
      processingFee: 103, // 72.5 + 30, rounded up
      applicationFee: 353,
      explorerReceives: 2147,
    });
  });

  it('caps the application fee at the charge amount', () => {
    const f = calculateSponsorshipFees(20);
    expect(f.applicationFee).toBe(20);
    expect(f.explorerReceives).toBe(0);
  });

  it('returns zeros for a zero amount', () => {
    expect(calculateSponsorshipFees(0).applicationFee).toBe(0);
    expect(estimateStripeFee(0)).toBe(0);
  });

  it('does not round an exact percent up', () => {
    // 3000¢: fee 300 + 117 = 417 → exactly 13.9%
    expect(applicationFeePercentFor(3000)).toBe(13.9);
  });

  it('limits the recurring percent to two decimals', () => {
    const percent = applicationFeePercentFor(1234);
    expect(Math.round(percent * 100) / 100).toBe(percent);
  });
});
