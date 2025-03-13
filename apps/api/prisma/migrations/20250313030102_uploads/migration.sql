-- CreateTable
CREATE TABLE "uploads" (
    "id" SERIAL NOT NULL,
    "file_type" CHAR(10) NOT NULL DEFAULT 'image',
    "original" VARCHAR(250) NOT NULL,
    "thumbnail" VARCHAR(250),
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
