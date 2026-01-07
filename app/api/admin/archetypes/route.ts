/**
 * GET /api/admin/archetypes
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

    const items = await prisma.archetype.findMany({
      where: { version },
      orderBy: [{ key: "asc" }],
    });

    return ok({
      version,
      items: items.map((a) => ({
        id: a.id,
        key: a.key,
        titleCn: a.titleCn,
        oneLinerCn: a.oneLinerCn,
        traitsCn: a.traitsCn,
        risksCn: a.risksCn,
        coachGuidanceCn: a.coachGuidanceCn,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get archetypes error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
