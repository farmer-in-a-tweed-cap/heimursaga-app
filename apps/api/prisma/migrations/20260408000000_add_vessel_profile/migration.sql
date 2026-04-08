-- Add vessel profile fields to expeditions
ALTER TABLE "trips" ADD COLUMN "vessel_name" VARCHAR(100);
ALTER TABLE "trips" ADD COLUMN "vessel_type" VARCHAR(20);
ALTER TABLE "trips" ADD COLUMN "vessel_length_m" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "vessel_draft_m" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "vessel_crew_size" INTEGER;
