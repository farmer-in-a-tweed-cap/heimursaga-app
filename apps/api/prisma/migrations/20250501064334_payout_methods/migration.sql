-- CreateTable
CREATE TABLE "payout_methods" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "platform" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "businessType" TEXT,
    "businessName" TEXT,
    "email" VARCHAR(50),
    "phone_number" VARCHAR(20),
    "stripe_account_id" TEXT,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
