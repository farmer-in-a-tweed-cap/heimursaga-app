-- AlterTable
ALTER TABLE "user_notifications" ADD COLUMN     "mention_post_id" INTEGER;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_mention_post_id_fkey" FOREIGN KEY ("mention_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
