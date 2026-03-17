import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '@/modules/event/event.enum';
import { PostHogService } from './posthog.service';

@Injectable()
export class PostHogListener {
  constructor(private posthog: PostHogService) {}

  @OnEvent(EVENTS.SIGNUP_COMPLETE)
  handleSignup(data: { userId: number; username?: string; email?: string }) {
    const id = String(data.userId);
    this.posthog.capture(id, 'signup_completed', { platform: 'api' });
    this.posthog.identify(id, {
      username: data.username,
      email: data.email,
    });
  }

  @OnEvent(EVENTS.ENTRY_CREATED)
  handleEntryCreated(data: { userId: number; entryId?: string; expeditionId?: string }) {
    this.posthog.capture(String(data.userId), 'entry_created', {
      entry_id: data.entryId,
      expedition_id: data.expeditionId,
    });
  }

  @OnEvent(EVENTS.SPONSORSHIP_CHECKOUT_COMPLETE)
  handleSponsorshipCheckout(data: { userId: number; creatorId?: number; checkoutId?: number }) {
    this.posthog.capture(String(data.userId), 'sponsorship_completed', {
      creator_id: data.creatorId,
      checkout_id: data.checkoutId,
    });
  }

  @OnEvent(EVENTS.SUBSCRIPTION_UPGRADE_COMPLETE)
  handleSubscriptionUpgrade(data: { userId: number; subscriptionPlanId?: number }) {
    this.posthog.capture(String(data.userId), 'subscription_upgraded', {
      plan_id: data.subscriptionPlanId,
    });
  }

  @OnEvent(EVENTS.EXPEDITION_COMPLETED)
  handleExpeditionCompleted(data: { userId: number; expeditionId?: string }) {
    this.posthog.capture(String(data.userId), 'expedition_completed', {
      expedition_id: data.expeditionId,
    });
  }

  @OnEvent(EVENTS.EXPEDITION_CANCELLED)
  handleExpeditionCancelled(data: { userId: number; expeditionId?: string }) {
    this.posthog.capture(String(data.userId), 'expedition_cancelled', {
      expedition_id: data.expeditionId,
    });
  }
}
