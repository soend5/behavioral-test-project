/**
 * GET /api/admin/archetypes/:id
 * PATCH /api/admin/archetypes/:id
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
  oneLinerCn: z.string().min(1).optional(),
  traitsCn: z.array(z.string().min(1)).optional(),
  risksCn: z.array(z.string().min(1)).optional(),
  coachGuidanceCn: z.array(z.string().min(1)).optional(),
  status: z.string().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const item = await prisma.archetype.findUnique({ where: { id: params.id } });
    if (!item) return fail(ErrorCode.NOT_FOUND, "未找到记录");
    return ok({
      id: item.id,
      key: item.key,
      titleCn: item.titleCn,
      oneLinerCn: item.oneLinerCn,
      traitsCn: item.traitsCn,
      risksCn: item.risksCn,
      coachGuidanceCn: item.coachGuidanceCn,
      version: item.version,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get archetype error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

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

    const before = await prisma.archetype.findUnique({
      where: { id: params.id },
    });
    if (!before) return fail(ErrorCode.NOT_FOUND, "未找到记录");

    const updated = await prisma.archetype.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await writeAudit(prisma, session.user.id, "admin.update_archetype", "archetype", updated.id, {
      key: updated.key,
      version: updated.version,
    });

    return ok({
      id: updated.id,
      key: updated.key,
      titleCn: updated.titleCn,
      oneLinerCn: updated.oneLinerCn,
      traitsCn: updated.traitsCn,
      risksCn: updated.risksCn,
      coachGuidanceCn: updated.coachGuidanceCn,
      version: updated.version,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "未找到记录");
    }
    console.error("Patch archetype error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
