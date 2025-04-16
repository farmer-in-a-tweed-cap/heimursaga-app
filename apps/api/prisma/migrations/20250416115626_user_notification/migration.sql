-- CreateTable
CREATE TABLE "user_notifications" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "context" VARCHAR(20),
    "body" TEXT,
    "is_read" BOOLEAN DEFAULT false,
    "user_id" INTEGER,
    "mention_user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_public_id_key" ON "user_notifications"("public_id");

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_mention_user_id_fkey" FOREIGN KEY ("mention_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
