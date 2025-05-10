/*
  Warnings:

  - You are about to drop the `membership_tiers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "membership_tiers" DROP CONSTRAINT "membership_tiers_user_id_fkey";

-- DropTable
DROP TABLE "membership_tiers";

-- CreateTable
CREATE TABLE "sponsorship_tiers" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "is_available" BOOLEAN DEFAULT false,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sponsorship_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_tiers_public_id_key" ON "sponsorship_tiers"("public_id");

-- AddForeignKey
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
