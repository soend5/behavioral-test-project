-- CreateTable
CREATE TABLE "config_versions" (
    "id" TEXT NOT NULL,
    "config_type" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "data_json" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "change_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "config_versions_config_type_config_id_version_idx" ON "config_versions"("config_type", "config_id", "version");

-- CreateIndex
CREATE INDEX "config_versions_config_type_config_id_created_at_idx" ON "config_versions"("config_type", "config_id", "created_at");
