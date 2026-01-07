/**
 * GET /api/admin/methodology
 *
 * 门禁：
 * - requireAdmin()
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

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
