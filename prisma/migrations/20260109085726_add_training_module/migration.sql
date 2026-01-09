-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_tasks" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "day_no" INTEGER NOT NULL,
    "order_no" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content_json" TEXT,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_enrollments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "attempt_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "response_json" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_plans_status_idx" ON "training_plans"("status");

-- CreateIndex
CREATE INDEX "training_tasks_plan_id_day_no_idx" ON "training_tasks"("plan_id", "day_no");

-- CreateIndex
CREATE UNIQUE INDEX "training_tasks_plan_id_day_no_order_no_key" ON "training_tasks"("plan_id", "day_no", "order_no");

-- CreateIndex
CREATE INDEX "training_enrollments_customer_id_status_idx" ON "training_enrollments"("customer_id", "status");

-- CreateIndex
CREATE INDEX "training_enrollments_status_started_at_idx" ON "training_enrollments"("status", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "training_enrollments_plan_id_customer_id_key" ON "training_enrollments"("plan_id", "customer_id");

-- CreateIndex
CREATE INDEX "task_completions_enrollment_id_idx" ON "task_completions"("enrollment_id");

-- CreateIndex
CREATE INDEX "task_completions_task_id_idx" ON "task_completions"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_enrollment_id_task_id_key" ON "task_completions"("enrollment_id", "task_id");

-- AddForeignKey
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "training_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "training_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "training_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
