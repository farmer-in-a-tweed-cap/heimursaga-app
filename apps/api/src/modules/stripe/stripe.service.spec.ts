import { PaymentTransactionType, StripeMetadataKey } from '@/common/enums';
import { EVENTS } from '@/modules/event';
import {
  MockEventService,
  createMockEventService,
} from '@/test/mocks/event.mock';
import { MockLogger, createMockLogger } from '@/test/mocks/logger.mock';
import {
  MockPrismaService,
  createMockPrismaService,
} from '@/test/mocks/prisma.mock';

import { StripeService } from './stripe.service';

describe('StripeService', () => {
  let service: StripeService;
  let prisma: MockPrismaService;
  let eventService: MockEventService;
  let logger: MockLogger;

  beforeEach(() => {
    prisma = createMockPrismaService();
    eventService = createMockEventService();
    logger = createMockLogger();

    service = new StripeService(
      logger as any,
      prisma as any,
      eventService as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── G1: Valid webhook signature → processes event ───
  describe('webhook() — G1: valid signature processes event', () => {
    it('should process a valid webhook event and return received: true', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            metadata: {
              [StripeMetadataKey.TRANSACTION]:
                PaymentTransactionType.SPONSORSHIP,
              [StripeMetadataKey.CHECKOUT_ID]: '1',
              [StripeMetadataKey.USER_ID]: '10',
              [StripeMetadataKey.CREATOR_ID]: '20',
            },
          },
        },
      };

      (service as any).stripe = {
        webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) },
      };

      prisma.processedWebhookEvent.create.mockResolvedValue({});
      eventService.trigger.mockResolvedValue(undefined);

      const result = await service.webhook({
        rawBody: Buffer.from('{}'),
        headers: { 'stripe-signature': 'sig_test' },
      } as any);

      expect(result).toEqual({ received: true });
      expect(prisma.processedWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          stripe_event_id: 'evt_123',
          event_type: 'payment_intent.succeeded',
        },
      });
    });
  });

  // ─── G2: Invalid webhook signature → throws 400 ───
  describe('webhook() — G2: invalid signature throws 400', () => {
    it('should throw on bad signature', async () => {
      (service as any).stripe = {
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw new Error('Webhook signature verification failed');
          }),
        },
      };

      await expect(
        service.webhook({
          rawBody: Buffer.from('{}'),
          headers: { 'stripe-signature': 'bad_sig' },
        } as any),
      ).rejects.toThrow('Webhook signature verification failed');
    });
  });

  // ─── G3: Duplicate event ID (P2002) → returns received: true ───
  describe('webhook() — G3: duplicate event returns received', () => {
    it('should skip duplicate events and return received: true', async () => {
      const mockEvent = {
        id: 'evt_dup',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: {} } },
      };

      (service as any).stripe = {
        webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) },
      };

      prisma.processedWebhookEvent.create.mockRejectedValue({ code: 'P2002' });

      const result = await service.webhook({
        rawBody: Buffer.from('{}'),
        headers: { 'stripe-signature': 'sig_test' },
      } as any);

      expect(result).toEqual({ received: true });
    });
  });

  // ─── G4: Processing failure → deletes dedup record, rethrows ───
  describe('webhook() — G4: processing failure deletes dedup record', () => {
    it('should delete dedup record and rethrow on processing error', async () => {
      const mockEvent = {
        id: 'evt_fail',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: {} } },
      };

      (service as any).stripe = {
        webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) },
      };

      prisma.processedWebhookEvent.create.mockResolvedValue({});
      prisma.processedWebhookEvent.deleteMany.mockResolvedValue({});

      jest
        .spyOn(service as any, 'handleWebhookEvent')
        .mockRejectedValue(new Error('Processing failed'));

      await expect(
        service.webhook({
          rawBody: Buffer.from('{}'),
          headers: { 'stripe-signature': 'sig_test' },
        } as any),
      ).rejects.toThrow();

      expect(prisma.processedWebhookEvent.deleteMany).toHaveBeenCalledWith({
        where: { stripe_event_id: 'evt_fail' },
      });
    });
  });

  // ─── G5: Unhandled event type → no error ───
  describe('webhook() — G5: unhandled event type processes without error', () => {
    it('should handle unknown event types gracefully', async () => {
      const mockEvent = {
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: { object: {} },
      };

      (service as any).stripe = {
        webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) },
      };

      prisma.processedWebhookEvent.create.mockResolvedValue({});

      const result = await service.webhook({
        rawBody: Buffer.from('{}'),
        headers: { 'stripe-signature': 'sig_test' },
      } as any);

      expect(result).toEqual({ received: true });
    });
  });

  // ─── G6: onPaymentIntentSucceeded — SUBSCRIPTION tx ───
  describe('onPaymentIntentSucceeded — G6: SUBSCRIPTION triggers upgrade event', () => {
    it('should trigger SUBSCRIPTION_UPGRADE_COMPLETE', async () => {
      eventService.trigger.mockResolvedValue(undefined);

      await (service as any).onPaymentIntentSucceeded({
        metadata: {
          [StripeMetadataKey.TRANSACTION]: PaymentTransactionType.SUBSCRIPTION,
          [StripeMetadataKey.CHECKOUT_ID]: '1',
          [StripeMetadataKey.USER_ID]: '10',
          [StripeMetadataKey.SUBSCRIPTION_PLAN_ID]: '5',
        },
      });

      expect(eventService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: EVENTS.SUBSCRIPTION_UPGRADE_COMPLETE,
          data: { userId: 10, subscriptionPlanId: 5, checkoutId: 1 },
        }),
      );
    });
  });

  // ─── G6: onPaymentIntentSucceeded — SPONSORSHIP tx ───
  describe('onPaymentIntentSucceeded — G6: SPONSORSHIP triggers sponsor event', () => {
    it('should trigger SPONSORSHIP_CHECKOUT_COMPLETE', async () => {
      eventService.trigger.mockResolvedValue(undefined);

      await (service as any).onPaymentIntentSucceeded({
        metadata: {
          [StripeMetadataKey.TRANSACTION]: PaymentTransactionType.SPONSORSHIP,
          [StripeMetadataKey.CHECKOUT_ID]: '2',
          [StripeMetadataKey.USER_ID]: '10',
          [StripeMetadataKey.CREATOR_ID]: '20',
        },
      });

      expect(eventService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: EVENTS.SPONSORSHIP_CHECKOUT_COMPLETE,
          data: { userId: 10, creatorId: 20, checkoutId: 2 },
        }),
      );
    });
  });

  // ─── G6: onPaymentIntentFailed → updates checkout to FAILED ───
  describe('onPaymentIntentFailed — G6: updates checkout to FAILED', () => {
    it('should set checkout status to FAILED using updateMany', async () => {
      prisma.checkout.updateMany.mockResolvedValue({ count: 1 });

      await (service as any).onPaymentIntentFailed({
        metadata: { [StripeMetadataKey.CHECKOUT_ID]: '5' },
        last_payment_error: { message: 'card_declined' },
      } as any);

      expect(prisma.checkout.updateMany).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'FAILED' },
      });
    });

    it('should not throw when checkout does not exist (updateMany returns count: 0)', async () => {
      prisma.checkout.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        (service as any).onPaymentIntentFailed({
          metadata: { [StripeMetadataKey.CHECKOUT_ID]: '999' },
          last_payment_error: { message: 'card_declined' },
        } as any),
      ).resolves.not.toThrow();
    });
  });

  // ─── G6: onInvoicePaymentSucceeded — renewal increments raised ───
  describe('onInvoicePaymentSucceeded — G6: renewal increments expedition raised', () => {
    it('should use expedition_public_id from checkout when available', async () => {
      (service as any).stripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue({
            metadata: {
              [StripeMetadataKey.CHECKOUT_ID]: '10',
              [StripeMetadataKey.TRANSACTION]:
                PaymentTransactionType.SPONSORSHIP,
              [StripeMetadataKey.CREATOR_ID]: '20',
              [StripeMetadataKey.USER_ID]: '10',
            },
          }),
        },
      };

      // Checkout has expedition_public_id
      prisma.checkout.findFirst.mockResolvedValue({
        expedition_public_id: 'exp_abc123',
      });
      // First findFirst call: find expedition by public_id
      prisma.expedition.findFirst.mockResolvedValue({ id: 100 });
      prisma.expedition.update.mockResolvedValue({});

      await (service as any).onInvoicePaymentSucceeded({
        subscription: 'sub_123',
        amount_paid: 1000,
        billing_reason: 'subscription_cycle',
      });

      expect(prisma.checkout.findFirst).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { expedition_public_id: true },
      });
      expect(prisma.expedition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ public_id: 'exp_abc123' }),
        }),
      );
      expect(prisma.expedition.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { raised: { increment: 1000 } },
      });
    });

    it('should fall back to latest active expedition when no expedition_public_id', async () => {
      (service as any).stripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue({
            metadata: {
              [StripeMetadataKey.CHECKOUT_ID]: '10',
              [StripeMetadataKey.TRANSACTION]:
                PaymentTransactionType.SPONSORSHIP,
              [StripeMetadataKey.CREATOR_ID]: '20',
              [StripeMetadataKey.USER_ID]: '10',
            },
          }),
        },
      };

      prisma.checkout.findFirst.mockResolvedValue({
        expedition_public_id: null,
      });
      prisma.expedition.findFirst.mockResolvedValue({ id: 100 });
      prisma.expedition.update.mockResolvedValue({});

      await (service as any).onInvoicePaymentSucceeded({
        subscription: 'sub_123',
        amount_paid: 1000,
        billing_reason: 'subscription_cycle',
      });

      expect(prisma.expedition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            author_id: 20,
            status: { in: ['active', 'planned'] },
          }),
        }),
      );
      expect(prisma.expedition.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { raised: { increment: 1000 } },
      });
    });
  });

  // ─── G6: onInvoicePaymentSucceeded — first invoice skips increment ───
  describe('onInvoicePaymentSucceeded — G6: first invoice skips raised increment', () => {
    it('should not increment raised for subscription_create billing_reason', async () => {
      (service as any).stripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue({
            metadata: {
              [StripeMetadataKey.CHECKOUT_ID]: '10',
              [StripeMetadataKey.TRANSACTION]:
                PaymentTransactionType.SPONSORSHIP,
              [StripeMetadataKey.CREATOR_ID]: '20',
              [StripeMetadataKey.USER_ID]: '10',
            },
          }),
        },
      };

      await (service as any).onInvoicePaymentSucceeded({
        subscription: 'sub_123',
        amount_paid: 1000,
        billing_reason: 'subscription_create',
      });

      expect(prisma.expedition.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── G6: onInvoicePaymentFailed — no pause → sets past_due ───
  describe('onInvoicePaymentFailed — G6: sets sponsorship to past_due', () => {
    it('should update sponsorship status to past_due', async () => {
      (service as any).stripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue({ pause_collection: null }),
        },
      };

      prisma.sponsorship.updateMany.mockResolvedValue({});

      await (service as any).onInvoicePaymentFailed({
        subscription: 'sub_456',
        attempt_count: 1,
        next_payment_attempt: 1700000000,
      });

      expect(prisma.sponsorship.updateMany).toHaveBeenCalledWith({
        where: { stripe_subscription_id: 'sub_456' },
        data: { status: 'past_due' },
      });
    });
  });

  // ─── J7: onInvoicePaymentFailed — pause_collection set → skips ───
  describe('onInvoicePaymentFailed — J7: pause_collection set skips status update', () => {
    it('should skip past_due update when pause_collection is set', async () => {
      (service as any).stripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue({
            pause_collection: { behavior: 'void' },
          }),
        },
      };

      await (service as any).onInvoicePaymentFailed({
        subscription: 'sub_paused',
        attempt_count: 1,
        next_payment_attempt: null,
      });

      expect(prisma.sponsorship.updateMany).not.toHaveBeenCalled();
    });
  });

  // ─── E5: onAccountUpdated — fully verified ───
  describe('onAccountUpdated — E5: fully verified sends STRIPE_VERIFIED notification', () => {
    it('should update verification and send STRIPE_VERIFIED notification', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue({
        explorer_id: 42,
        is_verified: false,
      });
      prisma.payoutMethod.updateMany.mockResolvedValue({});
      prisma.explorer.update.mockResolvedValue({});
      eventService.trigger.mockResolvedValue(undefined);

      await (service as any).onAccountUpdated({
        id: 'acct_123',
        requirements: { currently_due: [], pending_verification: [] },
        charges_enabled: true,
        payouts_enabled: true,
      });

      expect(prisma.payoutMethod.updateMany).toHaveBeenCalledWith({
        where: { stripe_account_id: 'acct_123' },
        data: { is_verified: true },
      });
      expect(eventService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: EVENTS.NOTIFICATION_CREATE,
          data: expect.objectContaining({
            context: 'stripe_verified',
            userId: 42,
          }),
        }),
      );
    });
  });

  // ─── E5: onAccountUpdated — action required ───
  describe('onAccountUpdated — E5: requirements due sends STRIPE_ACTION_REQUIRED', () => {
    it('should send STRIPE_ACTION_REQUIRED notification', async () => {
      prisma.payoutMethod.findFirst.mockResolvedValue({
        explorer_id: 42,
        is_verified: false,
      });
      prisma.payoutMethod.updateMany.mockResolvedValue({});
      prisma.explorer.update.mockResolvedValue({});
      eventService.trigger.mockResolvedValue(undefined);

      await (service as any).onAccountUpdated({
        id: 'acct_123',
        requirements: {
          currently_due: ['individual.verification.document'],
          pending_verification: [],
        },
        charges_enabled: false,
        payouts_enabled: false,
      });

      expect(eventService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: EVENTS.NOTIFICATION_CREATE,
          data: expect.objectContaining({
            context: 'stripe_action_required',
            userId: 42,
          }),
        }),
      );
    });
  });

  // ─── G6: onPayoutPaid → status COMPLETED ───
  describe('onPayoutPaid — G6: updates payout to COMPLETED', () => {
    it('should update payout status and arrival_date', async () => {
      prisma.payout.updateMany.mockResolvedValue({});

      await (service as any).onPayoutPaid({
        id: 'po_123',
        arrival_date: 1700000000,
      });

      expect(prisma.payout.updateMany).toHaveBeenCalledWith({
        where: { stripe_payout_id: 'po_123' },
        data: {
          status: 'COMPLETED',
          arrival_date: new Date(1700000000 * 1000),
        },
      });
    });
  });

  // ─── G6: onPayoutFailed → status FAILED ───
  describe('onPayoutFailed — G6: updates payout to FAILED', () => {
    it('should update payout status to FAILED', async () => {
      prisma.payout.updateMany.mockResolvedValue({});

      await (service as any).onPayoutFailed({
        id: 'po_fail',
        failure_message: 'insufficient funds',
      });

      expect(prisma.payout.updateMany).toHaveBeenCalledWith({
        where: { stripe_payout_id: 'po_fail' },
        data: { status: 'FAILED' },
      });
    });
  });

  // ─── G6: onSubscriptionDeleted — sponsorship + downgrade ───
  describe('onSubscriptionDeleted — G6: cancels sponsorships and downgrades', () => {
    it('should cancel sponsorships and downgrade explorer', async () => {
      prisma.sponsorship.updateMany.mockResolvedValue({});
      prisma.explorerSubscription.findFirst.mockResolvedValue({
        id: 1,
        explorer_id: 42,
      });

      const txMock = {
        explorerPlan: { deleteMany: jest.fn().mockResolvedValue({}) },
        explorer: { update: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      await (service as any).onSubscriptionDeleted({ id: 'sub_del' });

      expect(prisma.sponsorship.updateMany).toHaveBeenCalledWith({
        where: { stripe_subscription_id: 'sub_del' },
        data: { status: 'canceled' },
      });
      expect(txMock.explorerPlan.deleteMany).toHaveBeenCalledWith({
        where: { explorer_id: 42 },
      });
      expect(txMock.explorer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { role: 'user' },
      });
    });
  });

  // ─── G6: onSubscriptionDeleted — no explorer sub ───
  describe('onSubscriptionDeleted — G6: no explorer subscription', () => {
    it('should only cancel sponsorships', async () => {
      prisma.sponsorship.updateMany.mockResolvedValue({});
      prisma.explorerSubscription.findFirst.mockResolvedValue(null);

      await (service as any).onSubscriptionDeleted({ id: 'sub_del2' });

      expect(prisma.sponsorship.updateMany).toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─── G6: onSubscriptionUpdated — status mapping ───
  describe('onSubscriptionUpdated — G6: maps Stripe statuses correctly', () => {
    const statusMap = [
      ['active', 'active'],
      ['past_due', 'past_due'],
      ['canceled', 'canceled'],
      ['unpaid', 'unpaid'],
      ['paused', 'paused'],
      ['incomplete', 'pending'],
      ['incomplete_expired', 'pending'],
      ['trialing', 'active'],
    ] as const;

    statusMap.forEach(([stripeStatus, expectedStatus]) => {
      it(`should map "${stripeStatus}" → "${expectedStatus}"`, async () => {
        prisma.sponsorship.updateMany.mockResolvedValue({});
        prisma.explorerSubscription.findFirst.mockResolvedValue(null);

        await (service as any).onSubscriptionUpdated({
          id: 'sub_update',
          status: stripeStatus,
          pause_collection: null,
        });

        expect(prisma.sponsorship.updateMany).toHaveBeenCalledWith({
          where: { stripe_subscription_id: 'sub_update' },
          data: { status: expectedStatus },
        });
      });
    });
  });

  // ─── J7: onSubscriptionUpdated — pause_collection → skips ───
  describe('onSubscriptionUpdated — J7: pause_collection skips sponsorship sync', () => {
    it('should skip sponsorship status update', async () => {
      prisma.explorerSubscription.findFirst.mockResolvedValue(null);

      await (service as any).onSubscriptionUpdated({
        id: 'sub_paused',
        status: 'active',
        pause_collection: { behavior: 'void' },
      });

      expect(prisma.sponsorship.updateMany).not.toHaveBeenCalled();
    });
  });

  // ─── G6: onSubscriptionUpdated — Explorer Pro downgrade ───
  describe('onSubscriptionUpdated — G6: downgrades Explorer Pro on bad status', () => {
    it('should downgrade to USER on past_due', async () => {
      prisma.sponsorship.updateMany.mockResolvedValue({});
      prisma.explorerSubscription.findFirst.mockResolvedValue({
        id: 1,
        explorer_id: 42,
      });
      prisma.explorer.update.mockResolvedValue({});

      await (service as any).onSubscriptionUpdated({
        id: 'sub_pro',
        status: 'past_due',
        pause_collection: null,
      });

      expect(prisma.explorer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { role: 'user' },
      });
    });
  });

  // ─── G6: onSubscriptionUpdated — restore CREATOR ───
  describe('onSubscriptionUpdated — G6: restores CREATOR on active', () => {
    it('should restore CREATOR role', async () => {
      prisma.sponsorship.updateMany.mockResolvedValue({});
      prisma.explorerSubscription.findFirst.mockResolvedValue({
        id: 1,
        explorer_id: 42,
      });
      prisma.explorer.update.mockResolvedValue({});

      await (service as any).onSubscriptionUpdated({
        id: 'sub_pro',
        status: 'active',
        pause_collection: null,
      });

      expect(prisma.explorer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { role: 'creator' },
      });
    });
  });

  // ─── G6: onChargeRefunded → checkout REFUNDED + decrement raised ───
  describe('onChargeRefunded — G6: updates checkout to REFUNDED and decrements raised', () => {
    it('should use expedition_public_id from checkout and clamp raised to 0', async () => {
      prisma.checkout.updateMany.mockResolvedValue({});
      prisma.checkout.findFirst.mockResolvedValue({
        sponsored_explorer_id: 20,
        expedition_public_id: 'exp_abc123',
      });
      // Expedition found by public_id, current raised is 300 cents but refund is 500 cents
      prisma.expedition.findFirst.mockResolvedValue({ id: 100, raised: 300 });
      prisma.expedition.update.mockResolvedValue({});
      prisma.expedition.updateMany.mockResolvedValue({});

      await (service as any).onChargeRefunded({
        id: 'ch_123',
        payment_intent: 'pi_456',
        refunded: true,
        amount_refunded: 500,
      });

      expect(prisma.checkout.findFirst).toHaveBeenCalledWith({
        where: { stripe_payment_intent_id: 'pi_456' },
        select: { sponsored_explorer_id: true, expedition_public_id: true },
      });

      expect(prisma.expedition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ public_id: 'exp_abc123' }),
        }),
      );

      // Raised clamped to 0 (3 - 5 = -2, clamped to 0)
      expect(prisma.expedition.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { raised: 0 },
      });
    });

    it('should decrement sponsors_count on full refund', async () => {
      prisma.checkout.updateMany.mockResolvedValue({});
      prisma.checkout.findFirst.mockResolvedValue({
        sponsored_explorer_id: 20,
        expedition_public_id: null,
      });
      prisma.expedition.findFirst.mockResolvedValue({ id: 100, raised: 1000 });
      prisma.expedition.update.mockResolvedValue({});
      prisma.expedition.updateMany.mockResolvedValue({});

      await (service as any).onChargeRefunded({
        id: 'ch_123',
        payment_intent: 'pi_456',
        refunded: true,
        amount_refunded: 500,
      });

      // Should decrement sponsors_count
      expect(prisma.expedition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100 },
          data: { sponsors_count: { decrement: 1 } },
        }),
      );
    });

    it('should NOT decrement sponsors_count on partial refund', async () => {
      prisma.checkout.updateMany.mockResolvedValue({});
      prisma.checkout.findFirst.mockResolvedValue({
        sponsored_explorer_id: 20,
        expedition_public_id: null,
      });
      prisma.expedition.findFirst.mockResolvedValue({ id: 100, raised: 1000 });
      prisma.expedition.update.mockResolvedValue({});

      await (service as any).onChargeRefunded({
        id: 'ch_123',
        payment_intent: 'pi_456',
        refunded: false,
        amount_refunded: 200,
      });

      // raised update only (1000 - 200 = 800 cents)
      expect(prisma.expedition.update).toHaveBeenCalledTimes(1);
      expect(prisma.expedition.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { raised: 800 },
      });
    });

    it('should skip raised decrement when no sponsored_explorer_id', async () => {
      prisma.checkout.updateMany.mockResolvedValue({});
      prisma.checkout.findFirst.mockResolvedValue({
        sponsored_explorer_id: null,
        expedition_public_id: null,
      });

      await (service as any).onChargeRefunded({
        id: 'ch_123',
        payment_intent: 'pi_456',
        refunded: true,
        amount_refunded: 500,
      });

      expect(prisma.expedition.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── G6, L2: onDisputeCreated → triggers admin event ───
  describe('onDisputeCreated — G6, L2: triggers ADMIN_DISPUTE_CREATED', () => {
    it('should trigger admin dispute event', async () => {
      eventService.trigger.mockResolvedValue(undefined);

      await (service as any).onDisputeCreated({
        id: 'dp_123',
        charge: 'ch_456',
        amount: 2000,
        reason: 'fraudulent',
        status: 'warning_needs_response',
      });

      expect(eventService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: EVENTS.ADMIN_DISPUTE_CREATED,
          data: expect.objectContaining({
            disputeId: 'dp_123',
            chargeId: 'ch_456',
            amount: 2000,
            reason: 'fraudulent',
          }),
        }),
      );
    });
  });

  // ─── Idempotency key generation ───
  describe('generateIdempotencyKey', () => {
    it('should generate correct key format', () => {
      const key = service.generateIdempotencyKey('pi', 10, 500);
      expect(key).toBe('pi_10_500');
    });
  });
});
