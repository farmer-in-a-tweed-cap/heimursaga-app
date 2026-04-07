-- AlterTable: add is_guide to users
ALTER TABLE "users" ADD COLUMN "is_guide" BOOLEAN DEFAULT false;

-- CreateTable: invite_codes
CREATE TABLE "invite_codes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "label" VARCHAR(100),
    "created_by" INTEGER NOT NULL,
    "used_by" INTEGER,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");
CREATE INDEX "invite_codes_code_idx" ON "invite_codes"("code");
CREATE INDEX "invite_codes_created_by_idx" ON "invite_codes"("created_by");

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
