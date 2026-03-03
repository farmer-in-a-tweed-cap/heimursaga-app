# Stripe Testing Checklist

---

# PART 1: TEST MODE (Full Coverage)

> Run with `sk_test_` / `pk_test_` keys. Use Stripe test cards and test clocks.
> Complete this entire section before moving to live smoke tests.

---

## A. Explorer Pro Subscription — Signup

- [X] **A1. Monthly subscription with new card** — Select Monthly ($7/mo), enter test card `4242 4242 4242 4242`, complete payment. Verify: redirected to success page, user role = CREATOR, subscription record created with `period = month`, default sponsorship tiers created, payment method saved.
- [X] **A2. Annual subscription** — Select Annual ($50/yr), complete payment. Verify: correct amount charged, `period = year`, `current_period_end` ~1 year out.
- [X] **A3. Subscription with existing saved card** — Select saved card, no card form shown, payment completes, no duplicate payment method.
- [ ] **A4. 100% off promo code** — Create 100% off coupon + promo in Stripe Dashboard. Enter promo, verify $0.00 total, "ACTIVATE FREE TRIAL" button, no payment required, CREATOR role granted.
- [NA] **A5. Partial promo (50% off, first month)** — Enter promo, verify discounted amount, "first payment only" note, renewal shows full price.
- [NA] **A6. Repeating promo (50% off, 3 months)** — Verify "for 3 months" text, full price date calculated correctly.
- [X] **A7. Invalid promo code** — Enter fake code, verify "Invalid promo code" error, can still proceed without promo.
- [X] **A8. Remove applied promo** — Apply valid promo, click REMOVE, verify original price restored.
- [X] **A9. 3D Secure required** — Use card `4000 0025 0000 3155`, complete 3DS, verify subscription activates.
- [X] **A10. 3D Secure failed** — Use card `4000 0084 0000 1629`, fail 3DS, verify no subscription created, user role unchanged.
- [ ] **A11. Card declined** — Use card `4000 0000 0000 0002`, verify error shown, can retry with different card, no orphaned checkout left as PENDING.
- [ ] **A12. Insufficient funds** — Use card `4000 0000 0000 9995`, verify appropriate error message.

## B. Explorer Pro — Lifecycle Management

- [X] **B1. View subscription in Billing Settings** — Verify correct plan, billing period (MONTHLY/ANNUAL), next billing date from Stripe, status ACTIVE, correct price displayed ($7/mo or $50/yr).
- [X] **B2. Cancel subscription** — Click CANCEL, confirm, verify "CANCELING" status, end date shown, user retains CREATOR role until period end, Stripe has `cancel_at_period_end = true`.
- [X] **B3. Subscription expires after cancellation** — Use Stripe test clock to advance past period end. Verify `customer.subscription.deleted` webhook fires, user downgraded to USER, `explorerPlan` deleted.
- [ ] **B4. Payment failure on renewal** — Attach card `4000 0000 0000 0341` (succeeds on setup, fails on charge). Use test clock to advance to renewal. Verify `invoice.payment_failed` webhook fires, subscription goes `past_due`, user downgraded to USER.
- [ ] **B5. Recovery after payment failure** — Add valid test card as default, trigger retry in Stripe Dashboard. Verify subscription returns to `active`, CREATOR role restored.
- [X] **B6. Sidebar billing summary** — Verify cost label says "Monthly Cost: $7.00" or "Annual Cost: $50.00" based on actual period.

## C. Sponsorship — One-Time Payments

- [ ] **C1. Preset tier one-time sponsorship** — Select tier (e.g. $25), verify amount in summary, fee breakdown (5% platform fee), complete payment with `4242 4242 4242 4242`. Verify: sponsorship CONFIRMED, expedition `raised` incremented, `sponsors_count` incremented, creator notified via email.
- [ ] **C2. Custom amount sponsorship** — Enter $42, verify summary updates, fee recalculates. Complete payment, verify 4200 cents charged, application fee = 210 cents in Stripe Dashboard.
- [ ] **C3. Saved card sponsorship** — Select saved card, complete payment, no new payment method created.
- [ ] **C4. New card with save enabled** — Enter new card, leave "Save" checked, complete. Verify new card appears in Billing Settings.
- [ ] **C5. New card with save disabled** — Uncheck "Save", complete. Verify no new payment method saved.
- [ ] **C6. Minimum amount ($5)** — Enter $3, verify frontend error "Minimum amount is $5.00", submit disabled. Enter $5, verify accepted.
- [ ] **C7. Maximum amount ($10,000)** — Enter $15,000, verify server rejects. Enter $10,000, verify accepted.
- [ ] **C8. Anonymous sponsorship** — Uncheck "Show publicly", verify `is_public = false`, shows as "Anonymous" on public expedition page.
- [ ] **C9. Private message** — Enter message, uncheck public, verify message delivered to creator but hidden on public page.

## D. Sponsorship — Recurring Monthly

- [ ] **D1. Preset tier recurring** — Select monthly tier, verify "/mo" suffix, next charge date shown. Complete payment. Verify: Stripe subscription with `transfer_data.destination`, `application_fee_percent` set, sponsorship ACTIVE with `stripe_subscription_id`.
- [ ] **D2. Custom recurring amount** — Enter custom monthly amount ($15), verify dynamic Stripe Price created, correct amount charged.
- [ ] **D3. Recurring renewal (second month)** — Use Stripe test clock to advance 1 month. Verify `invoice.payment_succeeded` webhook fires with `billing_reason != subscription_create`, expedition `raised` incremented, NO duplicate sponsorship record.
- [ ] **D4. Cancel recurring sponsorship** — From Sponsorship Dashboard, cancel. Verify Stripe subscription canceled immediately, sponsorship status = `canceled`.
- [ ] **D5. Duplicate recurring prevention** — With active recurring to Creator X, try another. Verify recurring option disabled, server rejects if bypassed.
- [ ] **D6. Self-sponsorship blocked** — Navigate to sponsor your own expedition. Verify "You cannot sponsor yourself" error.
- [ ] **D7. Sponsorship to non-Pro creator** — Verify "not eligible to receive sponsorships" error.
- [ ] **D8. Sponsorship to unverified Stripe account** — Verify "Sponsorships Not Available" page, server validates `charges_enabled` and `payouts_enabled`.

## E. Stripe Connect Onboarding

- [ ] **E1. Create payout method** — As Pro user, initiate Stripe Connect setup. Verify Custom account created, `payoutMethod` record with `is_verified = false`.
- [ ] **E2. Idempotent creation** — Call create again, verify returns existing (no duplicate).
- [ ] **E3. Generate onboarding link** — Request link, verify URL from Stripe, `return_url` and `refresh_url` correct, ownership verified.
- [ ] **E4. Complete onboarding** — Follow link, complete verification with test data. Verify `account.updated` webhook fires, `is_verified = true`, `is_stripe_account_connected = true`, STRIPE_VERIFIED notification received.
- [ ] **E5. Partial onboarding** — Exit before completing. Verify `is_verified` stays `false`, STRIPE_ACTION_REQUIRED notification with due items listed.
- [ ] **E6. View account details** — `GET /stripe/account` returns verification status and capabilities. Returns 403 for non-Creator.
- [ ] **E7. Non-Creator blocked** — Regular USER cannot create payout method (403).

## F. Payout Flows

- [ ] **F1. View balance** — As verified Creator with sponsorships received. Verify available + pending balances, amounts in dollars, correct currency.
- [ ] **F2. Balance with no payout method** — Returns zero (not an error).
- [ ] **F3. Full payout** — Request full available balance. Verify Stripe payout created, local record PENDING, `arrival_date` set.
- [ ] **F4. Partial payout** — Request less than available, verify amount correct, remaining balance still available.
- [ ] **F5. Exceeds balance** — Request more than available. Verify "exceeds available balance" error with max amount shown.
- [ ] **F6. Below minimum** — Request $0.50. Verify "must be at least $1.00" error.
- [ ] **F7. Unverified account payout** — With `payouts_enabled = false`. Verify error about completing verification, local `is_verified` updated.
- [ ] **F8. Payout completion webhook** — After payout initiated, verify `payout.paid` webhook fires, status updated to COMPLETED.
- [ ] **F9. Payout failure webhook** — With invalid bank details, verify `payout.failed` webhook fires, status updated to FAILED.
- [ ] **F10. Payout history** — View all past payouts with correct status, amount, currency, dates.

## G. Webhook Handling

- [ ] **G1. Valid signature** — Properly signed event processes, 200 returned.
- [ ] **G2. Invalid signature** — Use `stripe trigger` with wrong webhook secret. Verify 400 returned, event NOT processed.
- [ ] **G3. Duplicate event** — Send same event ID twice (use Stripe CLI `--skip-verify` + replay). First processes, second returns `{ received: true }` without reprocessing.
- [ ] **G4. Processing failure and retry** — Temporarily break DB connection on first delivery, verify dedup record cleaned up, retry processes successfully.
- [ ] **G5. Unhandled event type** — Trigger an event not in the handler (e.g. `customer.created`). Verify 200 returned, no errors logged.
- [ ] **G6. All critical events fire and process correctly:**
  - `payment_intent.succeeded` — sponsorship/subscription checkout completed
  - `payment_intent.payment_failed` — checkout status updated
  - `invoice.payment_succeeded` — recurring renewal credits expedition
  - `invoice.payment_failed` — sponsorship set to past_due
  - `account.updated` — verification status synced
  - `payout.paid` — payout status COMPLETED
  - `payout.failed` — payout status FAILED
  - `customer.subscription.deleted` — sponsorship canceled AND Pro downgraded
  - `customer.subscription.updated` — status synced, role updated
  - `charge.refunded` — checkout status REFUNDED
  - `charge.dispute.created` — admin alert triggered

## H. Refund Scenarios

- [ ] **H1. Creator issues refund** — Refund a completed sponsorship. Verify refund created with `reverse_transfer: true` and `refund_application_fee: true`, checkout status REFUNDED, funds reversed from connected account.
- [ ] **H2. Already-refunded charge** — Attempt refund again. Verify "already refunded" error.
- [ ] **H3. charge.refunded webhook** — Verify checkout record updated to REFUNDED after Stripe fires event.
- [ ] **H4. Rate limiting** — Attempt >5 refunds in 60 seconds. Verify 429 Too Many Requests.

## I. Payment Method Management

- [ ] **I1. Add first card (auto-default)** — Setup intent confirmed, payment method attached, auto-set as default, shows DEFAULT badge.
- [ ] **I2. Add second card** — Saved but NOT auto-default, first retains DEFAULT.
- [ ] **I3. Change default** — Click SET DEFAULT on second card, Stripe customer `invoice_settings.default_payment_method` updated, UI reflects change.
- [ ] **I4. Delete non-default card** — Soft deleted, detached from Stripe, no longer in UI.
- [ ] **I5. Delete default (only) card** — Card removed. Note: next subscription invoice may fail without a payment method.

## J. Resting Explorer Billing

- [ ] **J1. 30+ days resting — auto-pause** — Set `resting_since` to 31 days ago, trigger cron. Verify subscriptions paused with `pause_collection: { behavior: 'void' }`, sponsorship status = `paused`.
- [ ] **J2. Exit resting — resume** — Clear `resting_since`, trigger event. Verify `pause_collection` cleared, sponsorship status = `active`.
- [ ] **J3. Resume finds canceled subscription** — Manually cancel one in Stripe, then trigger resume. Verify error caught, local status synced to `canceled`, other sponsorships still resume.
- [ ] **J4. 90+ days resting — auto-cancel** — Set `resting_since` to 91 days ago, trigger cron. Verify subscriptions canceled, sponsorship status = `canceled`, sponsor emails sent, `resting_since` cleared.
- [ ] **J5. Auto-cancel partial failure** — One subscription fails to cancel. Verify others still cancel, `resting_since` NOT cleared (retry on next cron).
- [ ] **J6. Expedition cancellation pauses sponsors** — Cancel expedition with recurring sponsors. Verify subscriptions paused, one-time unaffected, notifications sent to sponsors and explorer.
- [ ] **J7. Paused subscription webhook handling** — Verify `onSubscriptionUpdated` and `onInvoicePaymentFailed` detect `pause_collection` and skip status overwrite.

## K. Edge Cases

- [ ] **K1. Network timeout during payment** — Kill frontend connection mid-payment. If payment succeeded server-side, verify webhook still completes checkout.
- [ ] **K2. Browser closed during 3DS** — Start 3DS with `4000 0025 0000 3155`, close browser. Verify payment intent stays `requires_action`, no charge, checkout PENDING.
- [ ] **K3. Concurrent checkout submissions** — Submit two identical requests simultaneously. Verify idempotency key prevents duplicate Stripe objects, serializable isolation prevents double DB records.
- [ ] **K4. Webhook arrives before frontend** — (Natural race condition) Frontend finds checkout already CONFIRMED, returns success without double-processing.
- [ ] **K5. Frontend arrives before webhook** — Frontend completes checkout first, webhook finds already completed and skips.
- [ ] **K6. Failed subscription retry** — Fail checkout (card declined), then retry. Verify new checkout record created with new ID, new idempotency key works, old checkout stays CANCELED.
- [ ] **K7. Zero-amount edge cases** — 100% promo: no $0 payment intent created. Custom amount $0: rejected by validation.
- [ ] **K8. Boundary amounts** — $5 min accepted, $10,000 max accepted, $10,001 rejected.
- [ ] **K9. Currency consistency** — Verify all Stripe objects use `usd`, no mixed currency in DB.

## L. Monitoring & Data Integrity

- [ ] **L1. Webhook events logged** — Check server logs: each event logged with `stripe webhook: {type} ({id})`. Duplicates logged as `Duplicate webhook event {id}, skipping`.
- [ ] **L2. Dispute alerts** — Trigger test dispute in Stripe Dashboard. Verify `charge.dispute.created` logs error, emits ADMIN_DISPUTE_CREATED event.
- [ ] **L3. Required env vars validated** — Remove `STRIPE_SECRET_KEY`, start app. Verify exits with clear error.
- [ ] **L4. Frontend key validation** — Remove `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Verify console error, payment forms show error state (not blank crash).
- [ ] **L5. Checkout record completeness** — After successful payment: verify `stripe_payment_intent_id`, `total`, `status = CONFIRMED`, `confirmed_at` all populated.
- [ ] **L6. Explorer state consistency** — After upgrade: `role = CREATOR`, `explorerPlan` + `explorerSubscription` exist. After downgrade: `role = USER`, `explorerPlan` deleted.
- [ ] **L7. Processed webhook events table** — Verify unique constraint on `stripe_event_id` exists and is enforced.

---

# PART 2: LIVE SMOKE TEST

> Run with `sk_live_` / `pk_live_` keys and a real card.
> Only proceed after Part 1 passes completely in test mode.
> Use your own real card. All charges will be refunded at the end.
> Keep Stripe Dashboard open to monitor every charge in real time.

## Prerequisites

- [ ] Live Stripe keys configured in production environment
- [ ] Live webhook endpoint registered in Stripe Dashboard and receiving events
- [ ] Stripe Dashboard open in a browser tab to monitor charges
- [ ] A real credit/debit card ready (your own personal card)
- [ ] A second test account (or incognito) to act as sponsor

---

## LS-1. Webhook Connectivity

- [ ] **Verify webhook endpoint is reachable** — Check Stripe Dashboard > Webhooks > your live endpoint. Confirm status is "Enabled" and recent delivery attempts show 200 responses (or no attempts yet if fresh).

## LS-2. Explorer Pro Monthly Subscription

- [ ] **Subscribe to Monthly plan ($7/mo)** — Go to `/upgrade`, select Monthly, enter real card, complete payment.
- [ ] Verify: redirected to success page
- [ ] Verify: Stripe Dashboard shows $7.00 charge succeeded
- [ ] Verify: user role is now CREATOR in the app
- [ ] Verify: Billing Settings shows "Explorer Pro", "MONTHLY", "$7/mo", next billing date, status ACTIVE
- [ ] Verify: payment method saved and shown as DEFAULT

## LS-3. Payment Method Management

- [ ] **Add a second card** — Go to Billing Settings, add another real card (or same card, different entry).
- [ ] Verify: second card appears, first retains DEFAULT badge
- [ ] **Delete the second card** — Verify it disappears from the list and from Stripe Dashboard

## LS-4. Stripe Connect Onboarding

- [ ] **Set up Stripe Connect** — Initiate payout method creation, follow onboarding link.
- [ ] Verify: Stripe connected account created in Dashboard
- [ ] Complete onboarding with real identity info (or exit partially to test partial flow)
- [ ] Verify: `account.updated` webhook received (check Stripe Dashboard > Webhooks > recent events)
- [ ] Verify: STRIPE_VERIFIED (or STRIPE_ACTION_REQUIRED) notification in app

## LS-5. One-Time Sponsorship (from second account)

- [ ] **Log in as second user, sponsor the first user's expedition** — Select $5 minimum tier (smallest real charge), enter real card, complete payment.
- [ ] Verify: Stripe Dashboard shows charge with `application_fee_amount` (5% of $5 = $0.25)
- [ ] Verify: expedition `raised` incremented by $5
- [ ] Verify: `sponsors_count` incremented
- [ ] Verify: creator received sponsorship notification/email
- [ ] Verify: sponsor appears on expedition page (or "Anonymous" if set)
- [ ] Verify: `payment_intent.succeeded` webhook delivered successfully in Stripe Dashboard

## LS-6. Recurring Sponsorship (from second account)

- [ ] **Create $5/mo recurring sponsorship** to same creator.
- [ ] Verify: Stripe Dashboard shows subscription created with `transfer_data` to connected account
- [ ] Verify: sponsorship status ACTIVE in app
- [ ] Verify: expedition `raised` incremented

## LS-7. Cancel Recurring Sponsorship

- [ ] **Cancel the recurring sponsorship** from Sponsorship Dashboard.
- [ ] Verify: Stripe Dashboard shows subscription canceled
- [ ] Verify: sponsorship status = `canceled` in app

## LS-8. Balance and Payout (if Connect verified)

- [ ] **Check creator's balance** — Verify available balance reflects sponsorship income minus fees.
- [ ] **Request a payout** (if balance > $1 and bank account connected) — Verify payout created in Stripe Dashboard.
- [ ] *(Skip if Connect onboarding was only partial — balance will show but payout won't be possible)*

## LS-9. Refund the Sponsorship

- [ ] **Issue refund for the one-time sponsorship** — From creator's sponsorship admin.
- [ ] Verify: Stripe Dashboard shows refund with `reverse_transfer` (funds pulled back from connected account)
- [ ] Verify: checkout status = REFUNDED in DB
- [ ] Verify: `charge.refunded` webhook delivered

## LS-10. Cancel Pro Subscription

- [ ] **Cancel the Explorer Pro subscription** — Click CANCEL in Billing Settings, confirm.
- [ ] Verify: status shows "CANCELING" with end date
- [ ] Verify: Stripe Dashboard shows `cancel_at_period_end = true`
- [ ] Verify: user still has CREATOR role (within current period)

## LS-11. Refund the Pro Subscription (cleanup)

- [ ] **Refund the $7 subscription charge from Stripe Dashboard** — Go to Payments, find the $7 charge, issue full refund.
- [ ] Verify: money returned to your card
- [ ] *(This is manual cleanup — the app doesn't need to handle this automatically)*

## LS-12. Final Verification

- [ ] **Check Stripe Dashboard webhooks** — Verify all webhook deliveries during this session returned 200. Flag any failures.
- [ ] **Check server logs** — No unexpected errors during the smoke test.
- [ ] **Check Stripe Dashboard for any lingering objects** — No orphaned subscriptions in `incomplete` status, no unresolved payment intents.
- [ ] **Verify total cost** — You should have been charged ~$17 ($7 Pro + $5 one-time + $5 recurring). After refunds, net cost should be $0 (or just the recurring $5 if not refunded via Dashboard).

---

## Live Smoke Test — Cost Summary

| Charge | Amount | Refunded? |
|--------|--------|-----------|
| Explorer Pro Monthly | $7.00 | Yes (LS-11, via Stripe Dashboard) |
| One-Time Sponsorship | $5.00 | Yes (LS-9, via app) |
| Recurring Sponsorship (1st month) | $5.00 | Refund via Stripe Dashboard after test |
| **Net cost after refunds** | **$0.00** | |
