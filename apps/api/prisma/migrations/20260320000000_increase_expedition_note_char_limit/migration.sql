-- Increase expedition note and reply character limit from 280 to 500
ALTER TABLE "expedition_notes" ALTER COLUMN "text" TYPE VARCHAR(500);
ALTER TABLE "expedition_note_replies" ALTER COLUMN "text" TYPE VARCHAR(500);
