-- AlterTable
ALTER TABLE "flags" ADD COLUMN IF NOT EXISTS "flagged_expedition_id" INTEGER;
ALTER TABLE "flags" ADD COLUMN IF NOT EXISTS "flagged_explorer_id" INTEGER;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_flagged_expedition_id_fkey" FOREIGN KEY ("flagged_expedition_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "flags" ADD CONSTRAINT "flags_flagged_explorer_id_fkey" FOREIGN KEY ("flagged_explorer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "flags_flagged_expedition_id_idx" ON "flags"("flagged_expedition_id");
CREATE INDEX IF NOT EXISTS "flags_flagged_explorer_id_idx" ON "flags"("flagged_explorer_id");
