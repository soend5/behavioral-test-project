-- Content assets (v1) + stable IDs for quiz content

-- 1) Add stable_id to questions/options (backfill for any existing rows)
ALTER TABLE "questions" ADD COLUMN "stable_id" TEXT;
UPDATE "questions"
SET "stable_id" = 'order_' || "order_no"
WHERE "stable_id" IS NULL;
ALTER TABLE "questions" ALTER COLUMN "stable_id" SET NOT NULL;
CREATE UNIQUE INDEX "questions_quiz_id_stable_id_key"
  ON "questions"("quiz_id", "stable_id");

ALTER TABLE "options" ADD COLUMN "stable_id" TEXT;
UPDATE "options"
SET "stable_id" = 'order_' || "order_no"
WHERE "stable_id" IS NULL;
ALTER TABLE "options" ALTER COLUMN "stable_id" SET NOT NULL;
CREATE UNIQUE INDEX "options_question_id_stable_id_key"
  ON "options"("question_id", "stable_id");

-- 2) Content assets tables
CREATE TABLE "archetypes" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title_cn" TEXT NOT NULL,
  "one_liner_cn" TEXT NOT NULL,
  "traits_cn" JSONB NOT NULL,
  "risks_cn" JSONB NOT NULL,
  "coach_guidance_cn" JSONB NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "archetypes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "archetypes_key_version_key"
  ON "archetypes"("key", "version");
CREATE INDEX "archetypes_status_version_idx"
  ON "archetypes"("status", "version");

CREATE TABLE "training_handbook" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "training_handbook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_handbook_version_key"
  ON "training_handbook"("version");

CREATE TABLE "training_day" (
  "id" TEXT NOT NULL,
  "handbook_id" TEXT NOT NULL,
  "day_no" INTEGER NOT NULL,
  "title_cn" TEXT NOT NULL,
  "goal_cn" TEXT NOT NULL,
  "do_list_cn" JSONB NOT NULL,
  "dont_list_cn" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "training_day_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_day_handbook_id_day_no_key"
  ON "training_day"("handbook_id", "day_no");
CREATE INDEX "training_day_handbook_id_day_no_idx"
  ON "training_day"("handbook_id", "day_no");

CREATE TABLE "training_section" (
  "id" TEXT NOT NULL,
  "day_id" TEXT NOT NULL,
  "order_no" INTEGER NOT NULL,
  "title_cn" TEXT NOT NULL,
  "bullets_cn" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "training_section_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_section_day_id_order_no_key"
  ON "training_section"("day_id", "order_no");
CREATE INDEX "training_section_day_id_idx"
  ON "training_section"("day_id");

CREATE TABLE "methodology_doc" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "methodology_doc_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "methodology_doc_version_key"
  ON "methodology_doc"("version");

CREATE TABLE "methodology_section" (
  "id" TEXT NOT NULL,
  "doc_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title_cn" TEXT NOT NULL,
  "content_markdown" TEXT NOT NULL,
  "order_no" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "methodology_section_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "methodology_section_doc_id_slug_key"
  ON "methodology_section"("doc_id", "slug");
CREATE UNIQUE INDEX "methodology_section_doc_id_order_no_key"
  ON "methodology_section"("doc_id", "order_no");
CREATE INDEX "methodology_section_doc_id_idx"
  ON "methodology_section"("doc_id");

-- 3) Foreign keys
ALTER TABLE "training_day" ADD CONSTRAINT "training_day_handbook_id_fkey"
  FOREIGN KEY ("handbook_id") REFERENCES "training_handbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "training_section" ADD CONSTRAINT "training_section_day_id_fkey"
  FOREIGN KEY ("day_id") REFERENCES "training_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "methodology_section" ADD CONSTRAINT "methodology_section_doc_id_fkey"
  FOREIGN KEY ("doc_id") REFERENCES "methodology_doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
