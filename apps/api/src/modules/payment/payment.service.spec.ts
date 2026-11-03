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

import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: MockPrismaService;
  let stripe: MockStripeService;
  let eventService: MockEventService;
  let logger: MockLogger;

  const userSession = { userId: 1, userRole: 'user', sid: 'test-sid' } as any;

  beforeEach(() => {
    prisma = createMockPrismaService();
    stripe = createMockStripeService();
    eventService = createMockEventService();
    logger = createMockLogger();

    service = new PaymentService(
      logger as any,
      prisma as any,
      stripe as any,
      eventService as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('completeSubscriptionPlanUpgrade — A1: creates plan and sets CREATOR', () => {
    it('should upgrade user to CREATOR and create default tiers', async () => {
      prisma.checkout.findFirstOrThrow.mockResolvedValue({
        id: 100,
        public_id: 'co_123',
        plan_id: 5,
        explorer_id: 1,
        stripe_subscription_id: 'sub_123',
        stripe_payment_intent_id: 'pi_123',
      });

      prisma.explorer.findFirstOrThrow.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        username: 'testuser',
      });

      stripe.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' });
      stripe.subscriptions.retrieve.mockResolvedValue({
        status: 'active',
        current_period_end: 1700000000,
        items: { data: [{ plan: { interval: 'year' } }] },
      });

      prisma.plan.findFirstOrThrow.mockResolvedValue({ id: 5 });

      const txMock = {
        explorerPlan: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        explorerSubscription: {
          create: jest.fn().mockResolvedValue({ id: 50 }),
        },
        explorer: {
          update: jest.fn().mockResolvedValue({}),
        },
        sponsorshipTier: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({}),
        },
        checkout: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      prisma.plan.findUnique = jest.fn().mockResolvedValue({
        name: 'EXPLORER PRO',
        price_month: 500,
        price_year: 5000,
      });
      eventService.trigger.mockResolvedValue(undefined);

      await service.completeSubscriptionPlanUpgrade({ checkoutId: 100 } as any);

      expect(txMock.explorer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { role: 'creator' },
      });
      expect(txMock.explorerPlan.create).toHaveBeenCalled();
      // 3 one-time + 3 monthly = 6 default tiers
      expect(txMock.sponsorshipTier.create).toHaveBeenCalledTimes(6);
    });
  });

  // ─── K4: completeSubscriptionPlanUpgrade — already non-PENDING → skips ───
  describe('completeSubscriptionPlanUpgrade — K4: non-PENDING checkout throws', () => {
    it('should throw when checkout is not PENDING', async () => {
      prisma.checkout.findFirstOrThrow.mockRejectedValue(
        new Error('not found'),
      );

      await expect(
        service.completeSubscriptionPlanUpgrade({ checkoutId: 999 } as any),
      ).rejects.toThrow();
    });
  });

  // ─── B2: downgradeSubscriptionPlan — cancel_at_period_end ───
  describe('downgradeSubscriptionPlan — B2: schedules cancel_at_period_end', () => {
    it('should update Stripe subscription', async () => {
      prisma.explorer.findFirstOrThrow.mockResolvedValue({ id: 1 });
      prisma.explorerPlan.findFirstOrThrow.mockResolvedValue({
        plan_id: 5,
        subscription: { stripe_subscription_id: 'sub_downgrade' },
      });

      stripe.subscriptions.update.mockResolvedValue({});

      await service.downgradeSubscriptionPlan({ session: userSession } as any);

      expect(stripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_downgrade',
        {
          cancel_at_period_end: true,
        },
      );
    });
  });

  // ─── B2: reactivateSubscription — clears cancel_at_period_end ───
  describe('createPaymentMethod — I1: first card is set as default', () => {
    it('should auto-set default when only payment method', async () => {
      const txMock = {
        explorer: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            id: 1,
            username: 'testuser',
            email: 'test@test.com',
            stripe_customer_id: null,
          }),
        },
        paymentMethod: {
          create: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(1),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      stripe.paymentMethods.retrieve.mockResolvedValue({
        card: { brand: 'visa', last4: '4242' },
      });
      stripe.getOrCreateCustomer.mockResolvedValue({ id: 'cus_1' });
      stripe.paymentMethods.attach.mockResolvedValue({});
      stripe.customers.update.mockResolvedValue({});
      prisma.explorer.update.mockResolvedValue({});

      await service.createPaymentMethod({
        payload: { stripePaymentMethodId: 'pm_stripe_1' },
        session: userSession,
      } as any);

      // Stripe attach happens outside the transaction
      expect(stripe.paymentMethods.attach).toHaveBeenCalledWith('pm_stripe_1', {
        customer: 'cus_1',
      });
      expect(stripe.customers.update).toHaveBeenCalledWith(
        'cus_1',
        expect.objectContaining({
          invoice_settings: { default_payment_method: 'pm_stripe_1' },
        }),
      );
    });
  });

  // ─── I2: createPaymentMethod — second card → not default ───
  describe('createPaymentMethod — I2: second card is NOT set as default', () => {
    it('should not auto-set default when other methods exist', async () => {
      const txMock = {
        explorer: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            id: 1,
            username: 'testuser',
            email: 'test@test.com',
            stripe_customer_id: 'cus_1',
          }),
        },
        paymentMethod: {
          create: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(2),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      stripe.paymentMethods.retrieve.mockResolvedValue({
        card: { brand: 'mastercard', last4: '5555' },
      });
      stripe.getOrCreateCustomer.mockResolvedValue({ id: 'cus_1' });
      stripe.paymentMethods.attach.mockResolvedValue({});

      await service.createPaymentMethod({
        payload: { stripePaymentMethodId: 'pm_stripe_2' },
        session: userSession,
      } as any);

      expect(stripe.customers.update).not.toHaveBeenCalled();
    });
  });

  // ─── I5: createPaymentMethod — Stripe attach fails → soft-delete DB record ───
  describe('createPaymentMethod — I5: Stripe attach failure soft-deletes DB record', () => {
    it('should soft-delete the orphaned DB record when Stripe attach fails', async () => {
      const txMock = {
        explorer: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            id: 1,
            username: 'testuser',
            email: 'test@test.com',
            stripe_customer_id: 'cus_1',
          }),
        },
        paymentMethod: {
          create: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(1),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      stripe.paymentMethods.retrieve.mockResolvedValue({
        card: { brand: 'visa', last4: '4242' },
      });
      stripe.getOrCreateCustomer.mockResolvedValue({ id: 'cus_1' });
      stripe.paymentMethods.attach.mockRejectedValue(
        new Error('Stripe attach failed'),
      );
      prisma.paymentMethod.updateMany.mockResolvedValue({});

      await expect(
        service.createPaymentMethod({
          payload: { stripePaymentMethodId: 'pm_stripe_fail' },
          session: userSession,
        } as any),
      ).rejects.toThrow();

      // DB record should be soft-deleted
      expect(prisma.paymentMethod.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─── I3: setDefaultPaymentMethod ───
  describe('setDefaultPaymentMethod — I3: updates Stripe customer default', () => {
    it('should update customer invoice_settings', async () => {
      prisma.paymentMethod.findFirstOrThrow.mockResolvedValue({
        id: 1,
        stripe_payment_method_id: 'pm_stripe_default',
        explorer: { email: 'test@test.com', username: 'testuser' },
      });

      stripe.getOrCreateCustomer.mockResolvedValue({ id: 'cus_1' });
      prisma.explorer.update.mockResolvedValue({});
      stripe.customers.update.mockResolvedValue({});

      const result = await service.setDefaultPaymentMethod({
        query: { publicId: 'pm_local_1' },
        session: userSession,
      } as any);

      expect(result.success).toBe(true);
      expect(stripe.customers.update).toHaveBeenCalledWith(
        'cus_1',
        expect.objectContaining({
          invoice_settings: { default_payment_method: 'pm_stripe_default' },
        }),
      );
    });
  });

  // ─── I4: deletePaymentMethod ───
  describe('deletePaymentMethod — I4: detaches from Stripe then soft-deletes', () => {
    it('should detach from Stripe first, then soft-delete locally', async () => {
      prisma.paymentMethod.findFirstOrThrow.mockResolvedValue({
        id: 1,
        stripe_payment_method_id: 'pm_stripe_del',
      });
      prisma.paymentMethod.updateMany.mockResolvedValue({});
      stripe.paymentMethods.detach.mockResolvedValue({});

      await service.deletePaymentMethod({
        query: { publicId: 'pm_local_del' },
        session: userSession,
      } as any);

      // Stripe detach should be called before DB soft-delete
      expect(stripe.paymentMethods.detach).toHaveBeenCalledWith(
        'pm_stripe_del',
      );
      expect(prisma.paymentMethod.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should proceed with local cleanup when Stripe PM already detached (resource_missing)', async () => {
      prisma.paymentMethod.findFirstOrThrow.mockResolvedValue({
        id: 1,
        stripe_payment_method_id: 'pm_stripe_gone',
      });
      prisma.paymentMethod.updateMany.mockResolvedValue({});
      stripe.paymentMethods.detach.mockRejectedValue({
        code: 'resource_missing',
      });

      await service.deletePaymentMethod({
        query: { publicId: 'pm_local_gone' },
        session: userSession,
      } as any);

      expect(prisma.paymentMethod.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should propagate real Stripe errors', async () => {
      prisma.paymentMethod.findFirstOrThrow.mockResolvedValue({
        id: 1,
        stripe_payment_method_id: 'pm_stripe_err',
      });
      stripe.paymentMethods.detach.mockRejectedValue({
        code: 'api_error',
        message: 'Something went wrong',
      });

      await expect(
        service.deletePaymentMethod({
          query: { publicId: 'pm_local_err' },
          session: userSession,
        } as any),
      ).rejects.toThrow();

      expect(prisma.paymentMethod.updateMany).not.toHaveBeenCalled();
    });
  });
});
