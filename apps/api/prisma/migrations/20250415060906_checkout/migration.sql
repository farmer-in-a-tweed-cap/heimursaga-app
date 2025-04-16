/*
  Warnings:

  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'UNCAPTURED', 'CONFIRMED', 'CANCELED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "checkouts" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(20) NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT DEFAULT 'usd',
    "total" INTEGER NOT NULL,
    "expiry" TIMESTAMP(3),
    "stripe_payment_intent_id" VARCHAR(20),
    "stripe_product_id" VARCHAR(20),
    "stripe_requires_action" BOOLEAN DEFAULT false,
    "stripe_receipt_url" TEXT,
    "payment_method_id" INTEGER,
    "user_id" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkouts_public_id_key" ON "checkouts"("public_id");

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
