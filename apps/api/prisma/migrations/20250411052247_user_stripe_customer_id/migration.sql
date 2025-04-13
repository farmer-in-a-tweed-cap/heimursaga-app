-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_creator" BOOLEAN DEFAULT false,
ADD COLUMN     "stripe_customer_id" VARCHAR(40);
