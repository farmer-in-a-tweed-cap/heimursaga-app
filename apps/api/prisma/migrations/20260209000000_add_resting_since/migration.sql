-- AlterTable
ALTER TABLE "users" ADD COLUMN "resting_since" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_resting_since_idx" ON "users"("resting_since");

-- Backfill: Set resting_since for explorers with no active/planned expeditions
UPDATE "users" u SET "resting_since" = NOW()
WHERE "resting_since" IS NULL
AND NOT EXISTS (
  SELECT 1 FROM "trips" t
  WHERE t."author_id" = u."id"
  AND t."deleted_at" IS NULL
  AND t."status" IN ('planned', 'active')
);
