-- AlterTable
ALTER TABLE "checkouts" ADD COLUMN     "creator_id" INTEGER,
ADD COLUMN     "transactionType" TEXT,
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
