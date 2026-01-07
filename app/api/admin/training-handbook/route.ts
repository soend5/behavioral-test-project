/**
 * GET /api/admin/training-handbook
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

    const handbook = await prisma.trainingHandbook.findUnique({
      where: { version },
      include: {
        days: {
          orderBy: { dayNo: "asc" },
          include: {
            sections: {
              orderBy: { orderNo: "asc" },
            },
          },
        },
      },
    });

    if (!handbook) {
      return ok({ version, handbook: null });
    }

    return ok({
      version,
      handbook: {
        id: handbook.id,
        version: handbook.version,
        status: handbook.status,
        days: handbook.days.map((d) => ({
          id: d.id,
          dayNo: d.dayNo,
          titleCn: d.titleCn,
          goalCn: d.goalCn,
          doListCn: d.doListCn,
          dontListCn: d.dontListCn,
          sections: d.sections.map((s) => ({
            id: s.id,
            orderNo: s.orderNo,
            titleCn: s.titleCn,
            bulletsCn: s.bulletsCn,
          })),
        })),
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get training handbook error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
