/*
  Warnings:

  - You are about to drop the column `expiry` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `user_plans` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[subscription_id]` on the table `user_plans` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_plans" DROP COLUMN "expiry",
DROP COLUMN "period",
ADD COLUMN     "subscription_id" INTEGER;

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(20),
    "stripe_subscription_id" VARCHAR(40),
    "period" TEXT,
    "expiry" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_key" ON "user_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_plans_subscription_id_key" ON "user_plans"("subscription_id");

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
