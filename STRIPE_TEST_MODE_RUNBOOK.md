# Stripe Test Mode Transition Runbook

> Transition the production app to Stripe test mode for running the testing checklist,
> then restore live mode when done. Designed to protect all live data.

---

## Overview

The production database stores live-mode Stripe IDs (`cus_*`, `acct_*`, `sub_*`, `price_*`, etc.)
across 8 tables. These IDs don't exist in Stripe's test environment, so any API call referencing
them will 404. This runbook nullifies those references, runs tests, then restores everything.

**Estimated time:** 30 minutes setup, testing duration, 15 minutes teardown.

---

## PHASE 1: BACKUP (Do this first, no exceptions)

### 1.1 Full database backup

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup_pre_test_mode_$(date +%Y%m%d_%H%M%S).dump
```

Verify the backup file exists and is non-empty:

```bash
ls -lh backup_pre_test_mode_*.dump
```

### 1.2 Export live Stripe IDs (so you can restore them later)

Run this against your production database:

```sql
-- Save to a file or copy output somewhere safe
\copy (SELECT id, stripe_customer_id, stripe_account_id, is_stripe_account_connected FROM users WHERE stripe_customer_id IS NOT NULL OR stripe_account_id IS NOT NULL) TO '/tmp/stripe_backup_users.csv' CSV HEADER;

\copy (SELECT id, stripe_product_id, stripe_price_month_id, stripe_price_year_id FROM plans WHERE stripe_product_id IS NOT NULL) TO '/tmp/stripe_backup_plans.csv' CSV HEADER;

\copy (SELECT id, stripe_subscription_id FROM user_subscriptions WHERE stripe_subscription_id IS NOT NULL) TO '/tmp/stripe_backup_user_subscriptions.csv' CSV HEADER;

\copy (SELECT id, stripe_subscription_id FROM sponsorships WHERE stripe_subscription_id IS NOT NULL) TO '/tmp/stripe_backup_sponsorships.csv' CSV HEADER;

\copy (SELECT id, stripe_product_id, stripe_price_month_id, stripe_price_year_id FROM sponsorship_tiers WHERE stripe_product_id IS NOT NULL) TO '/tmp/stripe_backup_sponsorship_tiers.csv' CSV HEADER;

\copy (SELECT id, stripe_payment_method_id FROM payment_methods WHERE stripe_payment_method_id IS NOT NULL) TO '/tmp/stripe_backup_payment_methods.csv' CSV HEADER;

\copy (SELECT id, stripe_account_id, is_verified FROM payout_methods WHERE stripe_account_id IS NOT NULL) TO '/tmp/stripe_backup_payout_methods.csv' CSV HEADER;
```

### 1.3 Verify backups

```bash
wc -l /tmp/stripe_backup_*.csv
```

Each file should have at least a header row. Save these files somewhere safe outside the database server.

---

## PHASE 2: CREATE TEST-MODE STRIPE OBJECTS

### 2.1 Switch Stripe Dashboard to Test Mode

- Go to https://dashboard.stripe.com
- Toggle "Test mode" ON (top right)
- Confirm the orange "TEST MODE" banner is visible

### 2.2 Create Explorer Pro product and prices

In Stripe Dashboard (test mode):

1. Go to **Products** > **Add product**
2. Name: `Explorer Pro`
3. Add two prices:
   - **Monthly:** $7.00 USD, recurring monthly
   - **Annual:** $50.00 USD, recurring yearly
4. Save and note the IDs:

```
STRIPE_PLAN_PRODUCT_ID=prod_TEST_xxxxxxxx
STRIPE_PLAN_PRICE_MONTH_ID=price_TEST_monthly_xxxxxxxx
STRIPE_PLAN_PRICE_YEAR_ID=price_TEST_yearly_xxxxxxxx
```

### 2.3 Register test webhook endpoint

1. Go to **Developers** > **Webhooks** > **Add endpoint**
2. Endpoint URL: `https://YOUR_PRODUCTION_DOMAIN/v1/stripe`
3. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `account.updated`
   - `payout.paid`
   - `payout.failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `charge.refunded`
   - `charge.dispute.created`
4. Click **Add endpoint**
5. Click **Reveal** on the signing secret and note it:

```
STRIPE_WEBHOOK_SECRET=whsec_TEST_xxxxxxxx
```

### 2.4 Note your test API keys

From **Developers** > **API keys**:

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
```

---

## PHASE 3: NULLIFY LIVE STRIPE IDS IN DATABASE

> This makes the database safe for test-mode keys. Live data (users, expeditions,
> entries, sponsorship records) is preserved — only Stripe ID references are cleared.

### 3.1 Nullify Stripe IDs

Run this SQL against your production database:

```sql
BEGIN;

-- 1. Explorer/user Stripe references
UPDATE users SET
  stripe_customer_id = NULL,
  stripe_account_id = NULL,
  is_stripe_account_connected = false
WHERE stripe_customer_id IS NOT NULL
   OR stripe_account_id IS NOT NULL
   OR is_stripe_account_connected = true;

-- 2. Explorer Pro plan — update with test-mode price IDs
-- Replace these with your actual test-mode IDs from Step 2.2
UPDATE plans SET
  stripe_product_id = 'prod_TEST_xxxxxxxx',
  stripe_price_month_id = 'price_TEST_monthly_xxxxxxxx',
  stripe_price_year_id = 'price_TEST_yearly_xxxxxxxx'
WHERE slug = 'explorer-pro';

-- 3. Sponsorship tiers — nullify (app recreates on save)
UPDATE sponsorship_tiers SET
  stripe_product_id = NULL,
  stripe_price_month_id = NULL,
  stripe_price_year_id = NULL
WHERE stripe_product_id IS NOT NULL;

-- 4. Active recurring sponsorships — nullify subscription link
UPDATE sponsorships SET
  stripe_subscription_id = NULL
WHERE stripe_subscription_id IS NOT NULL;

-- 5. Explorer Pro subscriptions — nullify subscription link
UPDATE user_subscriptions SET
  stripe_subscription_id = NULL
WHERE stripe_subscription_id IS NOT NULL;

-- 6. Saved payment methods — nullify
UPDATE payment_methods SET
  stripe_payment_method_id = NULL
WHERE stripe_payment_method_id IS NOT NULL;

-- 7. Payout methods — nullify and unverify
UPDATE payout_methods SET
  stripe_account_id = NULL,
  is_verified = false
WHERE stripe_account_id IS NOT NULL;

-- 8. Clear webhook dedup table (test events will have different IDs)
-- This is optional but prevents the table from mixing test/live event IDs
DELETE FROM processed_webhook_events;

COMMIT;
```

### 3.2 Verify nullification

```sql
-- Should all return 0
SELECT COUNT(*) FROM users WHERE stripe_customer_id IS NOT NULL;
SELECT COUNT(*) FROM users WHERE stripe_account_id IS NOT NULL;
SELECT COUNT(*) FROM sponsorships WHERE stripe_subscription_id IS NOT NULL;
SELECT COUNT(*) FROM user_subscriptions WHERE stripe_subscription_id IS NOT NULL;
SELECT COUNT(*) FROM payment_methods WHERE stripe_payment_method_id IS NOT NULL;
SELECT COUNT(*) FROM payout_methods WHERE stripe_account_id IS NOT NULL;

-- Should return your test-mode IDs
SELECT stripe_product_id, stripe_price_month_id, stripe_price_year_id FROM plans WHERE slug = 'explorer-pro';
```

---

## PHASE 4: SWAP ENVIRONMENT VARIABLES

### 4.1 Backend API (`apps/api`)

Update these environment variables in your production deployment (Vercel, Railway, .env, etc.):

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_TEST_xxxxxxxx
STRIPE_PLAN_PRODUCT_ID=prod_TEST_xxxxxxxx
STRIPE_PLAN_PRICE_MONTH_ID=price_TEST_monthly_xxxxxxxx
STRIPE_PLAN_PRICE_YEAR_ID=price_TEST_yearly_xxxxxxxx
```

### 4.2 Frontend (`apps/web-v2`)

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
```

### 4.3 Restart / redeploy

Restart both the API and frontend so the new keys take effect.

### 4.4 Verify startup

Check API logs for:
- No "Missing required environment variable" errors
- Successful startup

Test a basic API call:
```bash
curl -s https://YOUR_DOMAIN/v1/health
```

---

## PHASE 5: SMOKE TEST BEFORE FULL CHECKLIST

Before running the full checklist, verify the plumbing works:

- [ ] **Load the upgrade page** (`/upgrade`) — should show $7/mo and $50/yr with no errors
- [ ] **Enter test card `4242 4242 4242 4242`** on checkout — should not error on price lookup
- [ ] **Check Stripe Dashboard (test mode)** — the new customer and subscription should appear
- [ ] **Check webhook deliveries** in Stripe Dashboard — the endpoint should show 200 responses

If any of these fail, check:
- Are the test-mode price IDs in the `plans` table correct?
- Is the API actually running with the test secret key? (Check logs for the Stripe API version log)
- Is the webhook endpoint reachable from Stripe? (Check for firewall/DNS issues)

---

## PHASE 6: RUN THE TESTING CHECKLIST

Open `STRIPE_TESTING_CHECKLIST.md` and work through **Part 1: Test Mode**.

Tips:
- Use Stripe CLI (`stripe listen --forward-to localhost:5001/v1/stripe`) if testing locally
- Use Stripe test clocks for subscription lifecycle tests (B3, B4, D3)
- Keep Stripe Dashboard open to cross-reference every charge, subscription, and webhook

---

## PHASE 7: RESTORE LIVE MODE

> Do this immediately after testing is complete. The production app should not
> stay in test mode longer than necessary.

### 7.1 Swap environment variables back to live

Restore your original live-mode values:

```env
# Backend
STRIPE_SECRET_KEY=sk_live_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxx
STRIPE_PLAN_PRODUCT_ID=prod_live_xxxxxxxx
STRIPE_PLAN_PRICE_MONTH_ID=price_live_monthly_xxxxxxxx
STRIPE_PLAN_PRICE_YEAR_ID=price_live_yearly_xxxxxxxx

# Frontend
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx
```

### 7.2 Restore live Stripe IDs in database

Use the CSV backups from Phase 1.2 to restore all nullified IDs:

```sql
BEGIN;

-- Restore users (explorer) Stripe IDs
-- Load from /tmp/stripe_backup_users.csv
\copy users_stripe_restore(id, stripe_customer_id, stripe_account_id, is_stripe_account_connected) FROM '/tmp/stripe_backup_users.csv' CSV HEADER;

UPDATE users u SET
  stripe_customer_id = r.stripe_customer_id,
  stripe_account_id = r.stripe_account_id,
  is_stripe_account_connected = r.is_stripe_account_connected
FROM users_stripe_restore r
WHERE u.id = r.id;

DROP TABLE users_stripe_restore;

COMMIT;
```

**Or, simpler — restore from the full database backup:**

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup_pre_test_mode_YYYYMMDD_HHMMSS.dump
```

> **Warning:** `pg_restore --clean` replaces the entire database. Any test data
> created during testing (test users, test checkouts) will be lost, which is fine.
> But any legitimate non-Stripe data created during the test window (real user signups,
> new entries) will also be lost. If the test window is short and no real users
> are active, full restore is the safest option.

### 7.3 Restart / redeploy

Restart both API and frontend with live keys.

### 7.4 Verify live mode restored

- [ ] Check API starts without errors
- [ ] Load `/upgrade` page — prices display correctly
- [ ] Check Billing Settings for an existing Pro user — subscription status loads from Stripe
- [ ] Check Stripe Dashboard (live mode) — webhook endpoint shows recent 200 responses
- [ ] Verify a Pro user still has CREATOR role and can access Pro features

### 7.5 Clean up

```bash
# Remove local backup files (after confirming everything works)
rm /tmp/stripe_backup_*.csv

# Optionally clean up test-mode Stripe objects
# Go to Stripe Dashboard (test mode) > Customers/Subscriptions and delete test data
```

---

## PHASE 8: ALTERNATIVE — SEPARATE TEST DATABASE (Safer)

If you'd rather not touch the production database at all:

### 8.1 Clone production DB to a test database

```bash
pg_dump "$PRODUCTION_DATABASE_URL" --format=custom --file=prod_clone.dump
createdb heimursaga_test
pg_restore --dbname=heimursaga_test prod_clone.dump
```

### 8.2 Run Phase 3 against the test database only

```bash
psql heimursaga_test < nullify_stripe_ids.sql
```

### 8.3 Point the API at the test database

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/heimursaga_test
```

### 8.4 Swap Stripe keys and test

Same as Phases 4-6 but against the cloned database.

### 8.5 When done, just delete the test database

```bash
dropdb heimursaga_test
```

No restore needed — production was never touched.

---

## Quick Reference: What Gets Nullified vs Preserved

| Data | Nullified? | Why |
|------|-----------|-----|
| User accounts, profiles, settings | **No** | Not Stripe-related |
| Expeditions, entries, waypoints | **No** | Not Stripe-related |
| Follows, bookmarks, notifications | **No** | Not Stripe-related |
| Messages, conversations | **No** | Not Stripe-related |
| Explorer Pro role (`role = 'CREATOR'`) | **No** | Preserved, but Pro features may not work until re-subscribed in test mode |
| `users.stripe_customer_id` | **Yes** | Auto-recreated on next Stripe operation |
| `users.stripe_account_id` | **Yes** | Must re-onboard Connect in test mode |
| `plans.stripe_price_*_id` | **Replaced** | Updated with test-mode price IDs |
| `sponsorship_tiers.stripe_*_id` | **Yes** | Recreated when tiers are saved |
| `sponsorships.stripe_subscription_id` | **Yes** | Recurring billing link broken (expected) |
| `user_subscriptions.stripe_subscription_id` | **Yes** | Pro status link broken (expected) |
| `payment_methods.stripe_payment_method_id` | **Yes** | Must re-add cards in test mode |
| `payout_methods.stripe_account_id` | **Yes** | Must re-onboard Connect in test mode |
| Completed checkouts | **No** | Historical records, not actively queried |
| Completed payouts | **No** | Historical records, not actively queried |
| Webhook dedup table | **Cleared** | Prevents test/live event ID mixing |
