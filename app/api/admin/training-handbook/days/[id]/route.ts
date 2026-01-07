/**
 * PATCH /api/admin/training-handbook/days/:id
 *
 * 门禁：
 * - requireAdmin()
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  titleCn: z.string().min(1).optional(),
  goalCn: z.string().min(1).optional(),
  doListCn: z.array(z.string().min(1)).optional(),
  dontListCn: z.array(z.string().min(1)).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.BAD_REQUEST, "请求体必须为 JSON");
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.VALIDATION_ERROR, "参数格式错误");
    }

    const existing = await prisma.trainingDay.findUnique({ where: { id: params.id } });
    if (!existing) return fail(ErrorCode.NOT_FOUND, "未找到记录");

    const updated = await prisma.trainingDay.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await writeAudit(prisma, session.user.id, "admin.update_training_day", "training_day", updated.id, {
      dayNo: updated.dayNo,
    });

    return ok({
      id: updated.id,
      dayNo: updated.dayNo,
      titleCn: updated.titleCn,
      goalCn: updated.goalCn,
      doListCn: updated.doListCn,
      dontListCn: updated.dontListCn,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Patch training day error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
