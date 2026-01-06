-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "nickname" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "qq" TEXT,
    "note" TEXT,
    "coach_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "quiz_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "invite_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "quiz_version" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "answers_json" TEXT,
    "scores_json" TEXT,
    "tags_json" TEXT,
    "stage" TEXT,
    "matched_sop_id" TEXT,
    "result_summary_json" TEXT,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_tags" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "tag_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_definition" (
    "sop_id" TEXT NOT NULL,
    "sop_name" TEXT NOT NULL,
    "sop_stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "state_summary" TEXT,
    "core_goal" TEXT,
    "strategy_list_json" TEXT,
    "forbidden_list_json" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sop_definition_pkey" PRIMARY KEY ("sop_id")
);

-- CreateTable
CREATE TABLE "sop_rule" (
    "rule_id" TEXT NOT NULL,
    "sop_id" TEXT NOT NULL,
    "required_stage" TEXT,
    "required_tags_json" TEXT,
    "excluded_tags_json" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sop_rule_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "coaching_stage" (
    "stage_id" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "stage_desc" TEXT,
    "ui_color" TEXT,
    "allow_actions" TEXT,
    "forbid_actions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaching_stage_pkey" PRIMARY KEY ("stage_id")
);

-- CreateTable
CREATE TABLE "sop_stage_map" (
    "id" TEXT NOT NULL,
    "sop_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sop_stage_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "quiz_version" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "order_no" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order_no" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "score_payload_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "meta_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_tags" ADD CONSTRAINT "coach_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_tags" ADD CONSTRAINT "coach_tags_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_rule" ADD CONSTRAINT "sop_rule_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "sop_definition"("sop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_stage_map" ADD CONSTRAINT "sop_stage_map_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "sop_definition"("sop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_stage_map" ADD CONSTRAINT "sop_stage_map_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "coaching_stage"("stage_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
