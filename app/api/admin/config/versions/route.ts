/**
 * GET /api/admin/config/versions - 获取配置版本历史
 * 
 * Query params:
 * - configType: "sop" | "script" | "training"
 * - configId: 配置ID
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function fail(code: string, message: string): ApiFail {
  return { ok: false, error: { code, message } };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(fail("UNAUTHORIZED", "需要管理员权限"), { status: 401 });
  }

  const configType = req.nextUrl.searchParams.get("configType");
  const configId = req.nextUrl.searchParams.get("configId");

  if (!configType || !configId) {
    return NextResponse.json(fail("MISSING_PARAMS", "缺少 configType 或 configId"), { status: 400 });
  }

  try {
    const versions = await prisma.configVersion.findMany({
      where: { configType, configId },
      orderBy: { version: "desc" },
      take: 20,
    });

    return NextResponse.json(ok({
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        changedBy: v.changedBy,
        changeNote: v.changeNote,
        createdAt: v.createdAt.toISOString(),
      })),
    }));
  } catch (error) {
    console.error("Get config versions error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), { status: 500 });
  }
}
