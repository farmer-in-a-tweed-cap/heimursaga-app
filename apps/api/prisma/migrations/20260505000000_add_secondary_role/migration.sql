-- Optional secondary role for platform-level tags (e.g. PLATFORM OFFICIAL,
-- ADMIN). Most accounts will have NULL here. Already present in prod —
-- run `prisma migrate resolve --applied 20260505000000_add_secondary_role`
-- on environments where the column was added out-of-band.

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "secondary_role" VARCHAR(40);
