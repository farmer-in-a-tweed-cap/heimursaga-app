-- Track Google identities for Sign in with Google

-- AlterTable
ALTER TABLE "users" ADD COLUMN "google_id" VARCHAR(40);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
