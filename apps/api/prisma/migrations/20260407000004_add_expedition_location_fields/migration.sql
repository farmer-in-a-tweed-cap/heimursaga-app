-- Add structured location fields to expeditions for better discoverability
ALTER TABLE "trips" ADD COLUMN "location_name" VARCHAR(200);
ALTER TABLE "trips" ADD COLUMN "country_code" VARCHAR(2);
ALTER TABLE "trips" ADD COLUMN "country_name" VARCHAR(100);
ALTER TABLE "trips" ADD COLUMN "state_province" VARCHAR(100);
