import { NextResponse } from "next/server";
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(fail("UNAUTHORIZED", "需要管理员权限"), { status: 401 });
  }

  try {
    // 统计系统标签使用次数（从 Attempt.tagsJson）
    const attempts = await prisma.attempt.findMany({
      where: { submittedAt: { not: null } },
      select: { tagsJson: true },
    });

    const stats: Record<string, number> = {};

    for (const attempt of attempts) {
      if (!attempt.tagsJson) continue;
      try {
        const tags: string[] = JSON.parse(attempt.tagsJson);
        for (const tag of tags) {
          stats[tag] = (stats[tag] || 0) + 1;
        }
      } catch {
        // ignore
      }
    }

    // 统计助教标签使用次数
    const coachTags = await prisma.coachTag.groupBy({
      by: ["tagKey"],
      _count: { tagKey: true },
    });

    for (const ct of coachTags) {
      stats[ct.tagKey] = (stats[ct.tagKey] || 0) + ct._count.tagKey;
    }

    return NextResponse.json(ok({ stats }));
  } catch (error) {
    console.error("Tag stats error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), { status: 500 });
  }
}
