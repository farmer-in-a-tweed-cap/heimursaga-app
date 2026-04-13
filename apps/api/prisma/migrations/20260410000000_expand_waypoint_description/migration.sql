-- Expand waypoint description column to accommodate imported route details (GPX/KML/GeoJSON)
-- Previous limit: VARCHAR(500) — too tight for guide blueprint route descriptions
-- New type: TEXT — uncapped at the DB level; frontend enforces 4000 chars for guides, 500 for explorers

ALTER TABLE "waypoints" ALTER COLUMN "description" TYPE TEXT;
