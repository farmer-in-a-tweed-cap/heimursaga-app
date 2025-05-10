-- AlterTable
ALTER TABLE "checkouts" ADD COLUMN     "plan_id" INTEGER;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
