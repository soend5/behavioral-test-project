/**
 * GET /api/coach/settings
 *
 * 门禁：
 * - requireCoach()
 *
 * 用途：
 * - 给助教端页面提供只读的全局默认配置（例如默认 quizVersion）
 */
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const INVITE_DEFAULT_QUIZ_VERSION_KEY = "invite_default_quiz_version";

export async function GET() {
  try {
    await requireCoach();

    let row: { value: string } | null = null;
    try {
      row = await prisma.systemSetting.findUnique({
        where: { key: INVITE_DEFAULT_QUIZ_VERSION_KEY },
        select: { value: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
        row = null;
      } else {
        throw e;
      }
    }

    return ok({
      inviteDefaultQuizVersion: row?.value || "v1",
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get coach settings error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
