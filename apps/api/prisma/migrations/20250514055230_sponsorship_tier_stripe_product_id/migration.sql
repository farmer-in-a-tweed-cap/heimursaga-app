/*
  Warnings:

  - You are about to drop the column `stripe_price_id` on the `sponsorship_tiers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sponsorship_tiers" DROP COLUMN "stripe_price_id",
ADD COLUMN     "stripe_price_month_id" VARCHAR(30),
ADD COLUMN     "stripe_price_year_id" VARCHAR(30),
ADD COLUMN     "stripe_product_id" VARCHAR(30);
