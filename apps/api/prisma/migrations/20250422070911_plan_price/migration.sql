-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "discount_year" INTEGER DEFAULT 0,
ADD COLUMN     "price_month" INTEGER DEFAULT 0,
ADD COLUMN     "price_year" INTEGER DEFAULT 0;
