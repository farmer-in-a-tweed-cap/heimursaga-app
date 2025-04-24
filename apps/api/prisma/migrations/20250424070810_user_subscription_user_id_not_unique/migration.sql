-- DropIndex
DROP INDEX "user_subscriptions_user_id_key";

-- AlterTable
ALTER TABLE "user_subscriptions" ALTER COLUMN "user_id" DROP NOT NULL;
