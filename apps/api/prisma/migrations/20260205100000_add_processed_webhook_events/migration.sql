-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" SERIAL NOT NULL,
    "stripe_event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_events_stripe_event_id_key" ON "processed_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "processed_webhook_events_stripe_event_id_idx" ON "processed_webhook_events"("stripe_event_id");
