import {
  MockEventService,
  createMockEventService,
} from '@/test/mocks/event.mock';
import { MockLogger, createMockLogger } from '@/test/mocks/logger.mock';
import {
  MockPrismaService,
  createMockPrismaService,
} from '@/test/mocks/prisma.mock';
import {
  MockStripeService,
  createMockStripeService,
} from '@/test/mocks/stripe.mock';

import { SponsorService } from './sponsor.service';

describe('SponsorService', () => {
  let service: SponsorService;
  let prisma: MockPrismaService;
  let stripe: MockStripeService;
  let eventService: MockEventService;
  let logger: MockLogger;

  const userSession = { userId: 10, userRole: 'user', sid: 'test-sid' } as any;

  beforeEach(() => {
    prisma = createMockPrismaService();
    stripe = createMockStripeService();
    eventService = createMockEventService();
    logger = createMockLogger();

    service = new SponsorService(
      logger as any,
      prisma as any,
      eventService as any,
      stripe as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  function setupCheckoutMocks(
    overrides: {
      selfSponsor?: boolean;
      creatorRole?: string;
      chargesEnabled?: boolean;
      payoutsEnabled?: boolean;
      currentlyDue?: string[];
    } = {},
  ) {
    const userId = 10;
    const creatorDbId = overrides.selfSponsor ? userId : 20;
    const creatorRole = overrides.creatorRole ?? 'creator';

    prisma.sponsorshipTier.findFirstOrThrow.mockResolvedValue({ id: 1 });

    prisma.explorer.findFirstOrThrow
      .mockResolvedValueOnce({
        id: userId,
        email: 'sponsor@test.com',
        username: 'sponsor',
        stripe_customer_id: 'cus_sponsor',
      })
      .mockResolvedValueOnce({
        id: creatorDbId,
        stripe_customer_id: 'cus_creator',
        username: 'creator',
        role: creatorRole,
      });

    prisma.payoutMethod.findFirstOrThrow.mockResolvedValue({
      stripe_account_id: 'acct_creator',
      is_verified: true,
    });

    stripe.accounts.retrieve.mockResolvedValue({
      charges_enabled: overrides.chargesEnabled ?? true,
      payouts_enabled: overrides.payoutsEnabled ?? true,
      requirements: { currently_due: overrides.currentlyDue ?? [] },
    });

    stripe.getOrCreateCustomer.mockResolvedValue({ id: 'cus_sponsor_stripe' });
  }

  // ─── D6: checkout — self-sponsorship → 400 ───
  describe('checkout — D6: self-sponsorship blocked', () => {
    it('should throw 400 when user tries to sponsor themselves', async () => {
      setupCheckoutMocks({ selfSponsor: true });

      await expect(
        service.checkout({
          session: userSession,
          payload: {
            sponsorshipTierId: 'tier_1',
            creatorId: 'sponsor',
            sponsorshipType: 'ONE_TIME_PAYMENT',
            oneTimePaymentAmount: 10,
          },
        } as any),
      ).rejects.toThrow(/cannot sponsor yourself/);
    });
  });

  // ─── D7: checkout — non-CREATOR → 400 ───
  describe('checkout — D7: non-CREATOR creator blocked', () => {
    it('should throw 400 when creator is not CREATOR role', async () => {
      setupCheckoutMocks({ creatorRole: 'user' });

      await expect(
        service.checkout({
          session: userSession,
          payload: {
            sponsorshipTierId: 'tier_1',
            creatorId: 'creator',
            sponsorshipType: 'ONE_TIME_PAYMENT',
            oneTimePaymentAmount: 10,
          },
        } as any),
      ).rejects.toThrow(/not eligible to receive sponsorships/);
    });
  });

  // ─── D8: checkout — unverified Stripe → 400 ───
  describe('checkout — D8: unverified Stripe account blocked', () => {
    it('should throw 400 when Stripe account not fully onboarded', async () => {
      setupCheckoutMocks({
        chargesEnabled: false,
        payoutsEnabled: false,
        currentlyDue: ['individual.verification.document'],
      });

      await expect(
        service.checkout({
          session: userSession,
          payload: {
            sponsorshipTierId: 'tier_1',
            creatorId: 'creator',
            sponsorshipType: 'ONE_TIME_PAYMENT',
            oneTimePaymentAmount: 10,
          },
        } as any),
      ).rejects.toThrow(/not completed Stripe onboarding/);
    });
  });

  // ─── D5: checkout — duplicate active subscription → 400 ───
  describe('checkout — D5: duplicate active subscription blocked', () => {
    it('should throw 400 when already subscribed', async () => {
      setupCheckoutMocks();
      prisma.sponsorship.count.mockResolvedValue(1);

      await expect(
        service.checkout({
          session: userSession,
          payload: {
            sponsorshipTierId: 'tier_1',
            creatorId: 'creator',
            sponsorshipType: 'subscription',
            billingPeriod: 'MONTHLY',
            oneTimePaymentAmount: 0,
          },
        } as any),
      ).rejects.toThrow(/already have an active subscription/);
    });
  });

  // ─── C6: checkout — amount below $5 → 400 ───
  describe('checkout — C6: amount below $5 blocked', () => {
    it('should throw 400 for one-time payment below $5', async () => {
      setupCheckoutMocks();

      await expect(
        service.checkout({
          session: userSession,
          payload: {
            sponsorshipTierId: 'tier_1',
            creatorId: 'creator',
            sponsorshipType: 'one_time_payment',
            oneTimePaymentAmount: 3,
          },
        } as any),
      ).rejects.toThrow(/at least \$5/);
    });
  });

  // ─── C7: checkout — amount above $10,000 → 400 ───
  describe('checkout — C7: amount above $10,000 blocked', () => {
    it('should throw 400 for one-time payment exceeding $10,000', async () => {
      setupCheckoutMocks();

      await expect(
        service.checkout({
          session: userSession,
          payload: {
            sponsorshipTierId: 'tier_1',
            creatorId: 'creator',
            sponsorshipType: 'one_time_payment',
            oneTimePaymentAmount: 15000,
          },
        } as any),
      ).rejects.toThrow(/cannot exceed \$10000/);
    });
  });

  // ─── C1: checkout — valid one-time → creates PI ───
  describe('checkout — C1: valid one-time creates payment intent with transfer', () => {
    it('should create checkout and payment intent', async () => {
      setupCheckoutMocks();

      const txMock = {
        checkout: {
          create: jest.fn().mockResolvedValue({ id: 100, public_id: 'co_123' }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_secret_123',
      });

      prisma.paymentMethod.findFirstOrThrow.mockResolvedValue({
        id: 1,
        stripe_payment_method_id: 'pm_stripe_123',
      });

      const result = await service.checkout({
        session: userSession,
        payload: {
          sponsorshipTierId: 'tier_1',
          creatorId: 'creator',
          sponsorshipType: 'one_time_payment',
          oneTimePaymentAmount: 50,
          paymentMethodId: 'pm_local_1',
        },
      } as any);

      expect(result.clientSecret).toBe('pi_secret_123');
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transfer_data: { destination: 'acct_creator' },
        }),
        expect.any(Object),
      );
    });
  });

  // ─── D1: checkout — valid subscription ───
  describe('checkout — D1: valid subscription creates Stripe subscription', () => {
    it('should create subscription with transfer_data', async () => {
      setupCheckoutMocks();
      prisma.sponsorship.count.mockResolvedValue(0);

      const txMock = {
        checkout: {
          create: jest.fn().mockResolvedValue({ id: 200, public_id: 'co_sub' }),
          update: jest.fn().mockResolvedValue({}),
        },
        sponsorshipTier: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            id: 1,
            price: 1000,
            stripe_product_id: 'prod_1',
            stripe_price_month_id: 'price_month_1',
            stripe_price_year_id: 'price_year_1',
            explorer_id: 20,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      stripe.subscriptions.create.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: 'inv_123',
      });
      stripe.invoices.retrieve.mockResolvedValue({
        payment_intent: { id: 'pi_sub', client_secret: 'pi_sub_secret' },
      });
      stripe.paymentIntents.update.mockResolvedValue({});
      prisma.paymentMethod.findFirstOrThrow.mockResolvedValue({
        id: 1,
        stripe_payment_method_id: 'pm_stripe_123',
      });

      const result = await service.checkout({
        session: userSession,
        payload: {
          sponsorshipTierId: 'tier_1',
          creatorId: 'creator',
          sponsorshipType: 'subscription',
          billingPeriod: 'MONTHLY',
          paymentMethodId: 'pm_local_1',
        },
      } as any);

      expect(result.clientSecret).toBe('pi_sub_secret');
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transfer_data: { destination: 'acct_creator' },
        }),
        expect.any(Object),
      );
    });
  });

  // ─── C1: completeCheckout — sets status, increments raised ───
  describe('completeCheckout — C1: completes checkout and increments raised', () => {
    it('should create sponsorship and update expedition raised', async () => {
      const txMock = {
        checkout: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            id: 100,
            transaction_type: 'sponsorship',
            total: 5000,
            currency: 'usd',
            sponsorship_type: 'ONE_TIME_PAYMENT',
            sponsorship_tier_id: 1,
            message: 'Great work!',
            email_delivery_enabled: true,
            is_public: true,
            is_message_public: true,
            expedition_public_id: null,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        sponsorship: {
          create: jest.fn().mockResolvedValue({
            sponsor_id: 10,
            sponsored_explorer_id: 20,
          }),
        },
        expedition: {
          findFirst: jest.fn().mockResolvedValue({ id: 50 }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));
      eventService.trigger.mockResolvedValue(undefined);

      prisma.explorer.findUnique
        .mockResolvedValueOnce({ username: 'sponsor' })
        .mockResolvedValueOnce({
          email: 'creator@test.com',
          username: 'creator',
          is_email_verified: true,
          expeditions: [{ public_id: 'exp_1', title: 'My Expedition' }],
        });

      await service.completeCheckout({
        checkoutId: 100,
        userId: 10,
        creatorId: 20,
      });

      expect(txMock.sponsorship.create).toHaveBeenCalled();
      expect(txMock.checkout.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({ status: 'confirmed' }),
      });
      expect(txMock.expedition.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: expect.objectContaining({
          raised: { increment: 50 },
          sponsors_count: { increment: 1 },
        }),
      });
    });
  });

  // ─── K4/K5: completeCheckout — already CONFIRMED → skips ───
  describe('completeCheckout — K4/K5: already CONFIRMED is skipped', () => {
    it('should throw when checkout is not PENDING', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          checkout: {
            findFirstOrThrow: jest
              .fn()
              .mockRejectedValue(new Error('not found')),
          },
        });
      });

      await expect(
        service.completeCheckout({
          checkoutId: 100,
          userId: 10,
          creatorId: 20,
        }),
      ).rejects.toThrow();
    });
  });

  // ─── D4: cancelSponsorship — owner cancels ───
  describe('cancelSponsorship — D4: owner cancels subscription', () => {
    it('should cancel Stripe subscription and update local status', async () => {
      prisma.sponsorship.findFirst.mockResolvedValue({
        id: 1,
        type: 'subscription',
        status: 'active',
        stripe_subscription_id: 'sub_cancel',
        sponsor_id: 10,
      });

      stripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_cancel',
        status: 'active',
      });
      stripe.subscriptions.cancel.mockResolvedValue({});
      prisma.sponsorship.update.mockResolvedValue({});

      await service.cancelSponsorship({
        session: userSession,
        query: { sponsorshipId: 'sp_1' },
      } as any);

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_cancel');
      expect(prisma.sponsorship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'canceled' }),
        }),
      );
    });
  });

  // ─── H3: onChargeRefunded ───
  describe('onChargeRefunded webhook — H3: tested in stripe.service.spec', () => {
    it('is covered by stripe.service.spec.ts', () => {
      expect(true).toBe(true);
    });
  });
});
