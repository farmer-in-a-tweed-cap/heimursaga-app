-- CreateTable
CREATE TABLE "email_verifications" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "expired" BOOLEAN DEFAULT false,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);
