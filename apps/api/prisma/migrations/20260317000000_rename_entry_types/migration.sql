-- Rename entry types: photo-essay -> photo, data-log -> data
UPDATE "posts" SET "entry_type" = 'photo' WHERE "entry_type" = 'photo-essay';
UPDATE "posts" SET "entry_type" = 'data' WHERE "entry_type" = 'data-log';
