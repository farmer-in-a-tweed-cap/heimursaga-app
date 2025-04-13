/*
  Warnings:

  - You are about to drop the column `paymentMethodId` on the `payment_methods` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "payment_methods" DROP COLUMN "paymentMethodId",
ADD COLUMN     "public_id" VARCHAR(14);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "public_id" VARCHAR(14);
