-- AlterTable
ALTER TABLE "trips" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "trips" ADD COLUMN "cancellation_reason" VARCHAR(500);
