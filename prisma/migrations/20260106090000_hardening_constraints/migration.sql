-- Add unique constraints and indexes for production hardening

-- Quiz: unique quiz_version + version
CREATE UNIQUE INDEX "quiz_quiz_version_version_key" ON "quiz"("quiz_version", "version");

-- Question: unique per quiz order_no
CREATE UNIQUE INDEX "questions_quiz_id_order_no_key" ON "questions"("quiz_id", "order_no");

-- Option: unique per question order_no
CREATE UNIQUE INDEX "options_question_id_order_no_key" ON "options"("question_id", "order_no");

-- CoachTag: unique per customer + coach + tag_key
CREATE UNIQUE INDEX "coach_tags_customer_id_coach_id_tag_key_key" ON "coach_tags"("customer_id", "coach_id", "tag_key");

-- SopStageMap: unique per sop + stage
CREATE UNIQUE INDEX "sop_stage_map_sop_id_stage_id_key" ON "sop_stage_map"("sop_id", "stage_id");

-- Common filter indexes
CREATE INDEX "customers_coach_id_idx" ON "customers"("coach_id");

CREATE INDEX "invites_coach_id_status_created_at_idx" ON "invites"("coach_id", "status", "created_at");
CREATE INDEX "invites_customer_id_version_status_idx" ON "invites"("customer_id", "version", "status");

CREATE INDEX "attempts_invite_id_submitted_at_started_at_idx" ON "attempts"("invite_id", "submitted_at", "started_at");
CREATE INDEX "attempts_customer_id_submitted_at_idx" ON "attempts"("customer_id", "submitted_at");
CREATE INDEX "attempts_coach_id_submitted_at_idx" ON "attempts"("coach_id", "submitted_at");

CREATE INDEX "sop_definition_status_sop_stage_priority_idx" ON "sop_definition"("status", "sop_stage", "priority");
CREATE INDEX "sop_rule_status_required_stage_sop_id_idx" ON "sop_rule"("status", "required_stage", "sop_id");

CREATE INDEX "sop_stage_map_stage_id_is_default_idx" ON "sop_stage_map"("stage_id", "is_default");

CREATE INDEX "quiz_status_idx" ON "quiz"("status");
CREATE INDEX "questions_quiz_id_status_idx" ON "questions"("quiz_id", "status");

CREATE INDEX "audit_log_actor_user_id_created_at_idx" ON "audit_log"("actor_user_id", "created_at");
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- Partial unique indexes for invariants (cannot be represented in Prisma schema)
-- Only 1 unsubmitted attempt per invite
CREATE UNIQUE INDEX "attempts_invite_id_unsubmitted_key" ON "attempts"("invite_id") WHERE "submitted_at" IS NULL;

-- Only 1 default SOP per stage
CREATE UNIQUE INDEX "sop_stage_map_stage_id_default_key" ON "sop_stage_map"("stage_id") WHERE "is_default" = true;

