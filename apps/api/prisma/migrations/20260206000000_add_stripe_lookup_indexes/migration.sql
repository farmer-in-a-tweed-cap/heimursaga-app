-- CreateIndex
CREATE INDEX "sponsorships_stripe_subscription_id_idx" ON "sponsorships"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "sponsorships_sponsored_user_id_idx" ON "sponsorships"("sponsored_user_id");

-- CreateIndex
CREATE INDEX "sponsorships_sponsor_id_idx" ON "sponsorships"("sponsor_id");

-- CreateIndex
CREATE INDEX "checkouts_stripe_payment_intent_id_idx" ON "checkouts"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "checkouts_stripe_subscription_id_idx" ON "checkouts"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "payout_methods_stripe_account_id_idx" ON "payout_methods"("stripe_account_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_stripe_subscription_id_idx" ON "user_subscriptions"("stripe_subscription_id");
