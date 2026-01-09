-- CreateTable
CREATE TABLE "script_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "trigger_stage" TEXT,
    "trigger_archetype" TEXT,
    "trigger_tags_json" TEXT,
    "content" TEXT NOT NULL,
    "variables_json" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_usage_logs" (
    "id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_logs" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "next_action" TEXT,
    "next_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "script_templates_status_category_idx" ON "script_templates"("status", "category");

-- CreateIndex
CREATE INDEX "script_templates_trigger_stage_trigger_archetype_idx" ON "script_templates"("trigger_stage", "trigger_archetype");

-- CreateIndex
CREATE INDEX "script_usage_logs_coach_id_used_at_idx" ON "script_usage_logs"("coach_id", "used_at");

-- CreateIndex
CREATE INDEX "script_usage_logs_script_id_idx" ON "script_usage_logs"("script_id");

-- CreateIndex
CREATE INDEX "follow_up_logs_customer_id_created_at_idx" ON "follow_up_logs"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "follow_up_logs_coach_id_next_date_idx" ON "follow_up_logs"("coach_id", "next_date");

-- AddForeignKey
ALTER TABLE "script_usage_logs" ADD CONSTRAINT "script_usage_logs_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "script_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_logs" ADD CONSTRAINT "follow_up_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
