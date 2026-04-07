-- Reduce expedition title and description character limits
-- Title: 200 -> 100, Description: TEXT -> VARCHAR(500)

-- Trim existing data that exceeds the new limits
UPDATE "trips" SET "title" = LEFT("title", 100) WHERE LENGTH("title") > 100;
UPDATE "trips" SET "description" = LEFT("description", 500) WHERE LENGTH("description") > 500;

-- Alter the column types
ALTER TABLE "trips" ALTER COLUMN "title" TYPE VARCHAR(100);
ALTER TABLE "trips" ALTER COLUMN "description" TYPE VARCHAR(500);
