import { createMockLogger, MockLogger } from '@/test/mocks/logger.mock';
import { createMockPrismaService, MockPrismaService } from '@/test/mocks/prisma.mock';
import { createMockStripeService, MockStripeService } from '@/test/mocks/stripe.mock';

import { PayoutService } from './payout.service';

describe('PayoutService', () => {
  let service: PayoutService;
  let prisma: MockPrismaService;
  let stripe: MockStripeService;
  let logger: MockLogger;

  const creatorSession = { userId: 1, userRole: 'creator', sid: 'test-sid' } as any;
  const userSession = { userId: 1, userRole: 'user', sid: 'test-sid' } as any;

  beforeEach(() => {
    prisma = createMockPrismaService();
    stripe = createMockStripeService();
    logger = createMockLogger();

    service = new PayoutService(logger as any, prisma as any, stripe as any);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── F1: getPayoutMethods — returns method with granular status ───
  describe('getPayoutMethods — F1: returns method with granular status fields', () => {
    it('should return payout method with account status', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue({
        public_id: 'pm_abc',
        platform: 'STRIPE',
        stripe_account_id: 'acct_123',
      });

      stripe.accounts.retrieve.mockResolvedValue({
        business_type: 'individual',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        default_currency: 'usd',
        country: 'US',
        requirements: { currently_due: [], past_due: [], pending_verification: [] },
        settings: { payouts: { schedule: { interval: 'manual' } } },
        business_profile: { name: 'Test Business' },
        individual: { email: 'test@example.com', phone: '+1234567890' },
      });

      const result = await service.getPayoutMethods({ session: creatorSession } as any);

      expect(result.results).toBe(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'pm_abc',
          isVerified: true,
          accountStatus: 'active',
          chargesEnabled: true,
          payoutsEnabled: true,
        }),
      );
    });
  });

  // ─── F1: getPayoutMethods — no method → empty ───
  describe('getPayoutMethods — F1: no method returns empty', () => {
    it('should return empty data', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue(null);

      const result = await service.getPayoutMethods({ session: creatorSession } as any);

      expect(result.results).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  // ─── F1: getPayoutMethods — Stripe fetch fails → graceful ───
  describe('getPayoutMethods — F1: Stripe fetch failure is graceful', () => {
    it('should handle Stripe account retrieval failure', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue({
        public_id: 'pm_abc',
        platform: 'STRIPE',
        stripe_account_id: 'acct_bad',
      });

      stripe.accounts.retrieve.mockRejectedValue(new Error('Stripe error'));

      const result = await service.getPayoutMethods({ session: creatorSession } as any);

      expect(result.results).toBe(1);
      expect(result.data[0].accountStatus).toBe('not_connected');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ─── F1: getBalance — returns available + pending ───
  describe('getBalance — F1: returns available and pending in dollars', () => {
    it('should convert cents to dollars', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue({
        id: 1,
        stripe_account_id: 'acct_123',
      });

      stripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 5000, currency: 'usd' }],
        pending: [{ amount: 2500, currency: 'usd' }],
      });

      const result = await service.getBalance({ session: creatorSession } as any);

      expect(result.available.amount).toBe(50);
      expect(result.pending.amount).toBe(25);
      expect(result.available.currency).toBe('usd');
    });
  });

  // ─── F2: getBalance — no payout method → zero ───
  describe('getBalance — F2: no payout method returns zero', () => {
    it('should return zero balance', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue(null);

      const result = await service.getBalance({ session: creatorSession } as any);

      expect(result.available.amount).toBe(0);
      expect(result.pending.amount).toBe(0);
    });
  });

  // ─── F1: getBalance — non-Creator → 403 ───
  describe('getBalance — F1: non-Creator throws 403', () => {
    it('should throw forbidden for USER role', async () => {
      await expect(service.getBalance({ session: userSession } as any)).rejects.toThrow();
    });
  });

  // ─── F3: createPayout — valid amount ───
  describe('createPayout — F3: valid amount creates payout', () => {
    it('should create Stripe payout and DB record', async () => {
      prisma.explorer.findFirstOrThrow.mockResolvedValue({ id: 1 });
      prisma.payoutMethod.findFirstOrThrow.mockResolvedValue({
        id: 10,
        stripe_account_id: 'acct_123',
        currency: 'usd',
      });
      stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: true });
      stripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 10000 }],
      });
      stripe.payouts.create.mockResolvedValue({
        id: 'po_new',
        amount: 5000,
        currency: 'usd',
        arrival_date: 1700000000,
      });
      prisma.payout.create.mockResolvedValue({ public_id: 'payout_abc' });

      const result = await service.createPayout({
        session: creatorSession,
        payload: { amount: 50 },
      } as any);

      expect(result.payoutId).toBe('payout_abc');
      expect(stripe.payouts.create).toHaveBeenCalled();
    });
  });

  // ─── F4: createPayout — partial amount ───
  describe('createPayout — F4: partial amount leaves remainder', () => {
    it('should create payout for partial balance', async () => {
      prisma.explorer.findFirstOrThrow.mockResolvedValue({ id: 1 });
      prisma.payoutMethod.findFirstOrThrow.mockResolvedValue({
        id: 10,
        stripe_account_id: 'acct_123',
        currency: 'usd',
      });
      stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: true });
      stripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 10000 }],
      });
      stripe.payouts.create.mockResolvedValue({
        id: 'po_partial',
        amount: 2500,
        currency: 'usd',
        arrival_date: 1700000000,
      });
      prisma.payout.create.mockResolvedValue({ public_id: 'payout_partial' });

      const result = await service.createPayout({
        session: creatorSession,
        payload: { amount: 25 },
      } as any);

      expect(result.payoutId).toBe('payout_partial');
    });
  });

  // ─── F5: createPayout — exceeds balance ───
  describe('createPayout — F5: exceeds balance throws error', () => {
    it('should throw when amount exceeds available balance', async () => {
      prisma.explorer.findFirstOrThrow.mockResolvedValue({ id: 1 });
      prisma.payoutMethod.findFirstOrThrow.mockResolvedValue({
        id: 10,
        stripe_account_id: 'acct_123',
        currency: 'usd',
      });
      stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: true });
      stripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 1000 }],
      });

      await expect(
        service.createPayout({
          session: creatorSession,
          payload: { amount: 50 },
        } as any),
      ).rejects.toThrow(/exceeds available balance/);
    });
  });

  // ─── F6: createPayout — below $1 minimum ───
  describe('createPayout — F6: below $1 minimum throws error', () => {
    it('should throw when amount below $1', async () => {
      prisma.explorer.findFirstOrThrow.mockResolvedValue({ id: 1 });
      prisma.payoutMethod.findFirstOrThrow.mockResolvedValue({
        id: 10,
        stripe_account_id: 'acct_123',
        currency: 'usd',
      });
      stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: true });
      stripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 5000 }],
      });

      await expect(
        service.createPayout({
          session: creatorSession,
          payload: { amount: 0.5 },
        } as any),
      ).rejects.toThrow(/at least \$1/);
    });
  });

  // ─── F7: createPayout — unverified account ───
  describe('createPayout — F7: unverified account throws and updates local', () => {
    it('should throw and update is_verified', async () => {
      prisma.explorer.findFirstOrThrow.mockResolvedValue({ id: 1 });
      prisma.payoutMethod.findFirstOrThrow.mockResolvedValue({
        id: 10,
        stripe_account_id: 'acct_123',
        currency: 'usd',
      });
      stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: false });
      prisma.payoutMethod.update.mockResolvedValue({});

      await expect(
        service.createPayout({
          session: creatorSession,
          payload: { amount: 50 },
        } as any),
      ).rejects.toThrow(/not enabled for payouts/);

      expect(prisma.payoutMethod.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { is_verified: false },
      });
    });
  });

  // ─── F10: getPayouts — returns history ───
  describe('getPayouts — F10: returns payout history', () => {
    it('should return formatted payout list', async () => {
      prisma.payout.count.mockResolvedValue(1);
      prisma.payout.findMany.mockResolvedValue([
        {
          public_id: 'po_1',
          status: 'COMPLETED',
          amount: 5000,
          currency: 'usd',
          created_at: new Date('2025-01-01'),
          arrival_date: new Date('2025-01-03'),
        },
      ]);

      const result = await service.getPayouts({ session: creatorSession } as any);

      expect(result.results).toBe(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'po_1',
          amount: 50,
          status: 'COMPLETED',
        }),
      );
    });
  });

  // ─── F1: createPayoutMethod — creates account + DB ───
  describe('createPayoutMethod — F1: creates account and DB record', () => {
    it('should create Stripe account and payout method', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue(null);
      stripe.createAccount.mockResolvedValue({ accountId: 'acct_new' });
      prisma.payoutMethod.create.mockResolvedValue({ public_id: 'pm_new' });

      const result = await service.createPayoutMethod({
        session: creatorSession,
        payload: { country: 'US' },
      } as any);

      expect(result.payoutMethodId).toBe('pm_new');
      expect(stripe.createAccount).toHaveBeenCalledWith({ country: 'US', userId: 1 });
    });
  });

  // ─── F1: createPayoutMethod — idempotent ───
  describe('createPayoutMethod — F1: existing method returns same ID', () => {
    it('should return existing payout method', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue({
        id: 10,
        public_id: 'pm_existing',
        stripe_account_id: 'acct_123',
      });

      const result = await service.createPayoutMethod({
        session: creatorSession,
        payload: { country: 'US' },
      } as any);

      expect(result.payoutMethodId).toBe('pm_existing');
      expect(stripe.createAccount).not.toHaveBeenCalled();
    });
  });

  // ─── E7: createPayoutMethod — non-Creator → 403 ───
  describe('createPayoutMethod — E7: non-Creator throws 403', () => {
    it('should throw forbidden for USER role', async () => {
      await expect(
        service.createPayoutMethod({
          session: userSession,
          payload: { country: 'US' },
        } as any),
      ).rejects.toThrow();
    });
  });
});
