-- AlterTable
ALTER TABLE "checkouts" ALTER COLUMN "stripe_payment_intent_id" SET DATA TYPE VARCHAR(40),
ALTER COLUMN "stripe_product_id" SET DATA TYPE VARCHAR(40);
