/**
 * GET /api/admin/methodology
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
  version: z.string().min(1).optional(),
  status: z.string().min(1),
});

const DeleteSchema = z.object({
  version: z.string().min(1).optional(),
  confirmText: z.literal("确认删除"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const version = searchParams.get("version") || "v1";

    const doc = await prisma.methodologyDoc.findUnique({
      where: { version },
      include: {
        sections: {
          orderBy: { orderNo: "asc" },
        },
      },
    });

    if (!doc) {
      return ok({ version, doc: null });
    }

    return ok({
      version,
      doc: {
        id: doc.id,
        version: doc.version,
        status: doc.status,
        sections: doc.sections.map((s) => ({
          id: s.id,
          slug: s.slug,
          titleCn: s.titleCn,
          contentMarkdown: s.contentMarkdown,
          orderNo: s.orderNo,
          updatedAt: s.updatedAt,
        })),
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get methodology error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function PATCH(request: NextRequest) {
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

    const version = parsed.data.version || "v1";
    const existing = await prisma.methodologyDoc.findUnique({ where: { version } });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "未找到记录");
    }

    const updated = await prisma.methodologyDoc.update({
      where: { version },
      data: { status: parsed.data.status },
    });

    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_methodology_doc",
      "methodology_doc",
      updated.id,
      { version: updated.version, status: updated.status }
    );

    return ok({
      id: updated.id,
      version: updated.version,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Patch methodology doc error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.BAD_REQUEST, "请求体必须为 JSON");
    }

    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.VALIDATION_ERROR, "请手动输入“确认删除”以继续");
    }

    const version = parsed.data.version || "v1";
    const existing = await prisma.methodologyDoc.findUnique({ where: { version } });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "未找到记录");
    }

    const updated = await prisma.methodologyDoc.update({
      where: { version },
      data: { status: "deleted" },
    });

    await writeAudit(
      prisma,
      session.user.id,
      "admin.delete_methodology_doc",
      "methodology_doc",
      updated.id,
      { version: updated.version }
    );

    return ok({
      id: updated.id,
      version: updated.version,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Delete methodology doc error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
