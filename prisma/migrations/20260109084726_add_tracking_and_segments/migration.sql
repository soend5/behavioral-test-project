-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "session_id" TEXT,
    "invite_token" TEXT,
    "user_id" TEXT,
    "customer_id" TEXT,
    "properties_json" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "invites_sent" INTEGER NOT NULL DEFAULT 0,
    "landing_page_views" INTEGER NOT NULL DEFAULT 0,
    "quiz_starts" INTEGER NOT NULL DEFAULT 0,
    "quiz_completes" INTEGER NOT NULL DEFAULT 0,
    "contact_clicks" INTEGER NOT NULL DEFAULT 0,
    "active_coaches" INTEGER NOT NULL DEFAULT 0,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "follow_up_logs" INTEGER NOT NULL DEFAULT 0,
    "script_usages" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_segments" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_events_event_created_at_idx" ON "tracking_events"("event", "created_at");

-- CreateIndex
CREATE INDEX "tracking_events_session_id_idx" ON "tracking_events"("session_id");

-- CreateIndex
CREATE INDEX "tracking_events_invite_token_event_idx" ON "tracking_events"("invite_token", "event");

-- CreateIndex
CREATE INDEX "tracking_events_user_id_event_idx" ON "tracking_events"("user_id", "event");

-- CreateIndex
CREATE INDEX "tracking_events_customer_id_event_idx" ON "tracking_events"("customer_id", "event");

-- CreateIndex
CREATE INDEX "daily_stats_date_idx" ON "daily_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_date_key" ON "daily_stats"("date");

-- CreateIndex
CREATE INDEX "customer_segments_segment_idx" ON "customer_segments"("segment");

-- CreateIndex
CREATE INDEX "customer_segments_customer_id_idx" ON "customer_segments"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_segments_customer_id_segment_key" ON "customer_segments"("customer_id", "segment");

-- AddForeignKey
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
