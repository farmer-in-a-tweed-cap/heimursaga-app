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

import { SponsorBillingService } from './sponsor-billing.service';

describe('SponsorBillingService', () => {
  let service: SponsorBillingService;
  let prisma: MockPrismaService;
  let stripe: MockStripeService;
  let eventService: MockEventService;
  let logger: MockLogger;

  beforeEach(() => {
    prisma = createMockPrismaService();
    stripe = createMockStripeService();
    eventService = createMockEventService();
    logger = createMockLogger();

    // Direct instantiation — bypasses NestJS DI
    service = new SponsorBillingService(
      logger as any,
      prisma as any,
      stripe as any,
      eventService as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── J1: pauseAllSponsorships — sets pause_collection on all active ───
  describe('pauseAllSponsorships — J1: pauses all active sponsorships', () => {
    it('should set pause_collection on Stripe and update local status to paused', async () => {
      prisma.explorer.findUnique.mockResolvedValue({
        resting_since: new Date('2025-01-01'),
      });

      prisma.sponsorship.findMany.mockResolvedValue([
        { id: 1, stripe_subscription_id: 'sub_1' },
        { id: 2, stripe_subscription_id: 'sub_2' },
      ]);

      stripe.subscriptions.update.mockResolvedValue({});
      prisma.sponsorship.update.mockResolvedValue({});

      await service.pauseAllSponsorships(42);

      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(2);
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
        pause_collection: { behavior: 'void' },
      });
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_2', {
        pause_collection: { behavior: 'void' },
      });

      expect(prisma.sponsorship.update).toHaveBeenCalledTimes(2);
      expect(prisma.sponsorship.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'paused' },
      });
    });
  });

  // ─── J1: pauseAllSponsorships — re-verifies resting before each ───
  describe('pauseAllSponsorships — J1: re-checks resting status before each operation', () => {
    it('should abort if explorer exits resting mid-pause', async () => {
      prisma.explorer.findUnique
        .mockResolvedValueOnce({ resting_since: new Date() })
        .mockResolvedValueOnce({ resting_since: new Date() })
        .mockResolvedValueOnce({ resting_since: null });

      prisma.sponsorship.findMany.mockResolvedValue([
        { id: 1, stripe_subscription_id: 'sub_1' },
        { id: 2, stripe_subscription_id: 'sub_2' },
      ]);

      stripe.subscriptions.update.mockResolvedValue({});
      prisma.sponsorship.update.mockResolvedValue({});

      await service.pauseAllSponsorships(42);

      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('exited resting mid-pause'),
      );
    });
  });

  // ─── J1: pauseAllSponsorships — not resting → skips ───
  describe('pauseAllSponsorships — J1: not resting skips entirely', () => {
    it('should skip if explorer is no longer resting', async () => {
      prisma.explorer.findUnique.mockResolvedValue({ resting_since: null });

      await service.pauseAllSponsorships(42);

      expect(prisma.sponsorship.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── J2: resumeAllSponsorships — clears pause_collection ───
  describe('resumeAllSponsorships — J2: clears pause_collection', () => {
    it('should clear pause_collection on Stripe and set status to active', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([
        { id: 1, stripe_subscription_id: 'sub_paused1' },
        { id: 2, stripe_subscription_id: 'sub_paused2' },
      ]);

      stripe.subscriptions.update.mockResolvedValue({});
      prisma.sponsorship.update.mockResolvedValue({});

      await service.resumeAllSponsorships(42);

      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_paused1', {
        pause_collection: null,
      });
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_paused2', {
        pause_collection: null,
      });
      expect(prisma.sponsorship.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'active' },
      });
    });
  });

  // ─── J3: resumeAllSponsorships — canceled in Stripe → syncs local ───
  describe('resumeAllSponsorships — J3: handles canceled-in-Stripe gracefully', () => {
    it('should sync local status to canceled when Stripe sub is already canceled', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([
        { id: 1, stripe_subscription_id: 'sub_gone' },
      ]);

      stripe.subscriptions.update.mockRejectedValue({
        code: 'resource_missing',
        message: 'No such subscription',
      });

      prisma.sponsorship.update.mockResolvedValue({});

      await service.resumeAllSponsorships(42);

      expect(prisma.sponsorship.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'canceled' },
      });
    });
  });

  // ─── J4: cancelAllPausedSponsorships — cancels all, sends emails ───
  describe('cancelAllPausedSponsorships — J4: cancels all and sends emails', () => {
    it('should cancel subscriptions and send email to each sponsor', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([
        {
          id: 1,
          stripe_subscription_id: 'sub_cancel1',
          sponsor: { email: 'sponsor1@test.com', username: 'sponsor1' },
          sponsored_explorer: {
            username: 'creator',
            profile: { name: 'Creator Name' },
          },
        },
        {
          id: 2,
          stripe_subscription_id: 'sub_cancel2',
          sponsor: { email: 'sponsor2@test.com', username: 'sponsor2' },
          sponsored_explorer: {
            username: 'creator',
            profile: { name: 'Creator Name' },
          },
        },
      ]);

      stripe.subscriptions.cancel.mockResolvedValue({});
      prisma.sponsorship.update.mockResolvedValue({});
      eventService.trigger.mockResolvedValue(undefined);
      prisma.explorer.update.mockResolvedValue({});

      await service.cancelAllPausedSponsorships(42);

      expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(2);
      expect(prisma.sponsorship.update).toHaveBeenCalledTimes(2);
      expect(eventService.trigger).toHaveBeenCalledTimes(2);

      expect(prisma.explorer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { resting_since: null },
      });
    });
  });

  // ─── J5: cancelAllPausedSponsorships — partial failure → keeps resting_since ───
  describe('cancelAllPausedSponsorships — J5: partial failure keeps resting_since', () => {
    it('should NOT clear resting_since when some cancellations fail', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([
        {
          id: 1,
          stripe_subscription_id: 'sub_ok',
          sponsor: { email: 'a@test.com', username: 'a' },
          sponsored_explorer: {
            username: 'creator',
            profile: { name: 'Creator' },
          },
        },
        {
          id: 2,
          stripe_subscription_id: 'sub_fail',
          sponsor: { email: 'b@test.com', username: 'b' },
          sponsored_explorer: {
            username: 'creator',
            profile: { name: 'Creator' },
          },
        },
      ]);

      stripe.subscriptions.cancel
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Stripe error'));

      prisma.sponsorship.update.mockResolvedValue({});
      eventService.trigger.mockResolvedValue(undefined);

      await service.cancelAllPausedSponsorships(42);

      expect(prisma.explorer.update).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('1 cancellations failed'),
      );
    });
  });

  // ─── J4: cancelAllPausedSponsorships — full success → clears resting_since ───
  describe('cancelAllPausedSponsorships — J4: full success clears resting_since', () => {
    it('should clear resting_since when all cancellations succeed', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([
        {
          id: 1,
          stripe_subscription_id: 'sub_1',
          sponsor: { email: 'a@test.com', username: 'a' },
          sponsored_explorer: {
            username: 'creator',
            profile: { name: 'Creator' },
          },
        },
      ]);

      stripe.subscriptions.cancel.mockResolvedValue({});
      prisma.sponsorship.update.mockResolvedValue({});
      eventService.trigger.mockResolvedValue(undefined);
      prisma.explorer.update.mockResolvedValue({});

      await service.cancelAllPausedSponsorships(42);

      expect(prisma.explorer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { resting_since: null },
      });
    });
  });

  // ─── Edge: cancelAllPausedSponsorships — no sponsorships → noop ───
  describe('cancelAllPausedSponsorships — no sponsorships is a noop', () => {
    it('should return early with no sponsorships', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([]);

      await service.cancelAllPausedSponsorships(42);

      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
      expect(prisma.explorer.update).not.toHaveBeenCalled();
    });
  });

  // ─── Edge: cancelAllPausedSponsorships — already canceled in Stripe → syncs ───
  describe('cancelAllPausedSponsorships — already canceled in Stripe syncs local', () => {
    it('should sync local status when Stripe sub is already canceled', async () => {
      prisma.sponsorship.findMany.mockResolvedValue([
        {
          id: 1,
          stripe_subscription_id: 'sub_already_gone',
          sponsor: { email: 'a@test.com', username: 'a' },
          sponsored_explorer: {
            username: 'creator',
            profile: { name: 'Creator' },
          },
        },
      ]);

      stripe.subscriptions.cancel.mockRejectedValue({
        code: 'resource_missing',
        message: 'No such subscription',
      });

      prisma.sponsorship.update.mockResolvedValue({});
      prisma.explorer.update.mockResolvedValue({});

      await service.cancelAllPausedSponsorships(42);

      expect(prisma.sponsorship.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'canceled' },
      });
      expect(prisma.explorer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { resting_since: null },
      });
    });
  });
});
