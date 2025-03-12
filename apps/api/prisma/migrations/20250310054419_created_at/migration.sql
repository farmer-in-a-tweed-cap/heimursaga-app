-- AlterTable
ALTER TABLE "post_bookmarks" ALTER COLUMN "created_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "post_likes" ALTER COLUMN "created_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_profiles" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_sessions" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;
