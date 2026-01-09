-- AlterTable
ALTER TABLE "script_templates" ADD COLUMN     "sop_id" TEXT;

-- CreateIndex
CREATE INDEX "script_templates_sop_id_idx" ON "script_templates"("sop_id");

-- AddForeignKey
ALTER TABLE "script_templates" ADD CONSTRAINT "script_templates_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "sop_definition"("sop_id") ON DELETE SET NULL ON UPDATE CASCADE;
