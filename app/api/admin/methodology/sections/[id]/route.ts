/**
 * PATCH /api/admin/methodology/sections/:id
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
  contentMarkdown: z.string().min(1).optional(),
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

    const existing = await prisma.methodologySection.findUnique({
      where: { id: params.id },
    });
    if (!existing) return fail(ErrorCode.NOT_FOUND, "未找到记录");

    const updated = await prisma.methodologySection.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_methodology_section",
      "methodology_section",
      updated.id,
      { slug: updated.slug, orderNo: updated.orderNo }
    );

    return ok({
      id: updated.id,
      slug: updated.slug,
      titleCn: updated.titleCn,
      contentMarkdown: updated.contentMarkdown,
      orderNo: updated.orderNo,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Patch methodology section error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
