-- Per-expedition opt-out for GPX route export.
-- Default TRUE so existing expeditions remain exportable (matches prior behavior).
ALTER TABLE "trips" ADD COLUMN "route_export_allowed" BOOLEAN DEFAULT true;
