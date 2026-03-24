-- CreateTable
CREATE TABLE "expedition_voice_notes" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "expedition_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "audio_url" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "caption" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expedition_voice_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expedition_voice_notes_public_id_key" ON "expedition_voice_notes"("public_id");

-- CreateIndex
CREATE INDEX "expedition_voice_notes_expedition_id_created_at_idx" ON "expedition_voice_notes"("expedition_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "expedition_voice_notes" ADD CONSTRAINT "expedition_voice_notes_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedition_voice_notes" ADD CONSTRAINT "expedition_voice_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
