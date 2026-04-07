-- Add blueprint fields to trips table
ALTER TABLE "trips" ADD COLUMN "is_blueprint" BOOLEAN DEFAULT false;
ALTER TABLE "trips" ADD COLUMN "blueprint_id" INTEGER;
ALTER TABLE "trips" ADD COLUMN "is_route_locked" BOOLEAN DEFAULT false;
ALTER TABLE "trips" ADD COLUMN "mode" VARCHAR(20);
ALTER TABLE "trips" ADD COLUMN "adoptions_count" INTEGER DEFAULT 0;
ALTER TABLE "trips" ADD COLUMN "average_rating" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "ratings_count" INTEGER DEFAULT 0;

-- Blueprint self-referential FK
ALTER TABLE "trips" ADD CONSTRAINT "trips_blueprint_id_fkey"
  FOREIGN KEY ("blueprint_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "trips_is_blueprint_deleted_at_idx" ON "trips"("is_blueprint", "deleted_at");
CREATE INDEX "trips_blueprint_id_idx" ON "trips"("blueprint_id");
CREATE INDEX "trips_mode_idx" ON "trips"("mode");

-- Blueprint reviews table
CREATE TABLE "blueprint_reviews" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "blueprint_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "blueprint_reviews_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "blueprint_reviews_public_id_key" ON "blueprint_reviews"("public_id");
CREATE UNIQUE INDEX "blueprint_reviews_blueprint_id_user_id_key" ON "blueprint_reviews"("blueprint_id", "user_id");
CREATE INDEX "blueprint_reviews_blueprint_id_idx" ON "blueprint_reviews"("blueprint_id");
CREATE INDEX "blueprint_reviews_user_id_idx" ON "blueprint_reviews"("user_id");

-- Foreign keys
ALTER TABLE "blueprint_reviews" ADD CONSTRAINT "blueprint_reviews_blueprint_id_fkey"
  FOREIGN KEY ("blueprint_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blueprint_reviews" ADD CONSTRAINT "blueprint_reviews_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
