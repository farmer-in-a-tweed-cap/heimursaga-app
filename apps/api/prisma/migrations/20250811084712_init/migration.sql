-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'UNCAPTURED', 'CONFIRMED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" TEXT NOT NULL,
    "role" VARCHAR(10) NOT NULL,
    "is_premium" BOOLEAN DEFAULT false,
    "is_email_verified" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "bookmarks_count" INTEGER DEFAULT 0,
    "followers_count" INTEGER DEFAULT 0,
    "following_count" INTEGER DEFAULT 0,
    "posts_count" INTEGER DEFAULT 0,
    "stripe_customer_id" VARCHAR(40),
    "is_stripe_account_connected" BOOLEAN DEFAULT false,
    "stripe_account_id" VARCHAR(40),
    "blocked" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "sid" VARCHAR(48) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "device" VARCHAR(100),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "expired" BOOLEAN DEFAULT false,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" SERIAL NOT NULL,
    "picture" VARCHAR(200),
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "bio" VARCHAR(200),
    "name" VARCHAR(50),
    "location_from" VARCHAR(200),
    "location_lives" VARCHAR(200),
    "sponsors_fund" VARCHAR(500),
    "sponsors_fund_journey_id" VARCHAR(50),
    "sponsors_fund_type" VARCHAR(20),
    "portfolio" VARCHAR(500),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "followee_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(20),
    "name" VARCHAR(20),
    "description" TEXT,
    "is_available" BOOLEAN DEFAULT false,
    "stripe_product_id" VARCHAR(20),
    "features" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "stripe_price_month_id" VARCHAR(30),
    "stripe_price_year_id" VARCHAR(30),
    "discount_year" INTEGER DEFAULT 0,
    "price_month" INTEGER DEFAULT 0,
    "price_year" INTEGER DEFAULT 0,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorships" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "expiry" TIMESTAMP(3),
    "next_charge" TIMESTAMP(3),
    "tier_id" INTEGER,
    "stripe_subscription_id" VARCHAR(30),
    "status" TEXT DEFAULT 'pending',
    "message" VARCHAR(500),
    "email_delivery_enabled" BOOLEAN DEFAULT true,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_tiers" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "is_available" BOOLEAN DEFAULT false,
    "priority" INTEGER DEFAULT 1,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "members_count" INTEGER DEFAULT 0,
    "stripe_price_month_id" VARCHAR(30),
    "stripe_price_year_id" VARCHAR(30),
    "stripe_product_id" VARCHAR(30),

    CONSTRAINT "sponsorship_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plans" (
    "plan_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" INTEGER,

    CONSTRAINT "user_plans_pkey" PRIMARY KEY ("plan_id","user_id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(20),
    "stripe_subscription_id" VARCHAR(40),
    "period" TEXT,
    "expiry" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "place" VARCHAR(250),
    "public" BOOLEAN DEFAULT false,
    "public_id" VARCHAR(14),
    "bookmarks_count" INTEGER DEFAULT 0,
    "likes_count" INTEGER DEFAULT 0,
    "waypoint_id" INTEGER,
    "sponsored" BOOLEAN DEFAULT false,
    "is_draft" BOOLEAN DEFAULT false,
    "email_sent" BOOLEAN DEFAULT false,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waypoints" (
    "id" SERIAL NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "public" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "description" VARCHAR(500),
    "title" VARCHAR(200),
    "date" TIMESTAMP(3),
    "author_id" INTEGER,

    CONSTRAINT "waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "public" BOOLEAN DEFAULT true,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_waypoints" (
    "waypoint_id" INTEGER NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_waypoints_pkey" PRIMARY KEY ("trip_id","waypoint_id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "post_id" INTEGER NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("post_id","upload_id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "post_bookmarks" (
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" SERIAL NOT NULL,
    "file_type" VARCHAR(10) NOT NULL DEFAULT 'image',
    "original" VARCHAR(250) NOT NULL,
    "thumbnail" VARCHAR(250),
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "public_id" VARCHAR(40),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "expired" BOOLEAN DEFAULT false,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkouts" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(20) NOT NULL,
    "currency" TEXT DEFAULT 'usd',
    "total" INTEGER NOT NULL,
    "expiry" TIMESTAMP(3),
    "stripe_payment_intent_id" VARCHAR(40),
    "stripe_product_id" VARCHAR(40),
    "stripe_requires_action" BOOLEAN DEFAULT false,
    "stripe_receipt_url" TEXT,
    "payment_method_id" INTEGER,
    "user_id" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "plan_id" INTEGER,
    "stripe_subscription_id" VARCHAR(40),
    "creator_id" INTEGER,
    "sponsorship_type" TEXT,
    "transaction_type" TEXT,
    "sponsorship_tier_id" INTEGER,
    "message" VARCHAR(500),
    "email_delivery_enabled" BOOLEAN DEFAULT true,

    CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" SERIAL NOT NULL,
    "stripe_payment_method_id" TEXT,
    "label" TEXT,
    "last4" TEXT,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "public_id" VARCHAR(14),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_methods" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "platform" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR(50),
    "phone_number" VARCHAR(20),
    "stripe_account_id" TEXT,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "business_name" TEXT,
    "business_type" TEXT,
    "currency" TEXT,

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "payout_method_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "confirmed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "currency" TEXT,
    "stripe_payout_id" VARCHAR(40),
    "arrival_date" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "context" VARCHAR(20),
    "body" TEXT,
    "is_read" BOOLEAN DEFAULT false,
    "user_id" INTEGER,
    "mention_user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "mention_post_id" INTEGER,
    "sponsorship_amount" INTEGER,
    "sponsorship_currency" VARCHAR(3),
    "sponsorship_type" VARCHAR(20),

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sid_key" ON "user_sessions"("sid");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_followee_id_key" ON "user_follows"("follower_id", "followee_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorships_public_id_key" ON "sponsorships"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_tiers_public_id_key" ON "sponsorship_tiers"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_plans_subscription_id_key" ON "user_plans"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkouts_public_id_key" ON "checkouts"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_methods_public_id_key" ON "payout_methods"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_public_id_key" ON "payouts"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_public_id_key" ON "user_notifications"("public_id");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "sponsorship_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_waypoint_id_fkey" FOREIGN KEY ("waypoint_id") REFERENCES "waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waypoints" ADD CONSTRAINT "waypoints_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_waypoint_id_fkey" FOREIGN KEY ("waypoint_id") REFERENCES "waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_method_id_fkey" FOREIGN KEY ("payout_method_id") REFERENCES "payout_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_mention_post_id_fkey" FOREIGN KEY ("mention_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_mention_user_id_fkey" FOREIGN KEY ("mention_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

