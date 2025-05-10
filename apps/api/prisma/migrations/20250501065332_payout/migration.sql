/*
  Warnings:

  - You are about to drop the column `businessName` on the `payout_methods` table. All the data in the column will be lost.
  - You are about to drop the column `businessType` on the `payout_methods` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[public_id]` on the table `payout_methods` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payout_methods" DROP COLUMN "businessName",
DROP COLUMN "businessType",
ADD COLUMN     "business_name" TEXT,
ADD COLUMN     "business_type" TEXT;

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

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payouts_public_id_key" ON "payouts"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_methods_public_id_key" ON "payout_methods"("public_id");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_method_id_fkey" FOREIGN KEY ("payout_method_id") REFERENCES "payout_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
