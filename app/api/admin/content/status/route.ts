/**
 * GET /api/admin/content/status
 *
 * 用途：
 * - Admin Dashboard 显示 v1 种子数据导入状态（只读）
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

    const [fastQuiz, proQuiz] = await Promise.all([
      prisma.quiz.findUnique({
        where: { quizVersion_version: { quizVersion: version, version: "fast" } },
        select: { id: true },
      }),
      prisma.quiz.findUnique({
        where: { quizVersion_version: { quizVersion: version, version: "pro" } },
        select: { id: true },
      }),
    ]);

    const [fastQuestionCount, fastOptionCount] = fastQuiz
      ? await Promise.all([
          prisma.question.count({ where: { quizId: fastQuiz.id } }),
          prisma.option.count({ where: { question: { quizId: fastQuiz.id } } }),
        ])
      : [0, 0];

    const [proQuestionCount, proOptionCount] = proQuiz
      ? await Promise.all([
          prisma.question.count({ where: { quizId: proQuiz.id } }),
          prisma.option.count({ where: { question: { quizId: proQuiz.id } } }),
        ])
      : [0, 0];

    const [archetypeCount, trainingDayCount, trainingSectionCount, methodologySectionCount] =
      await Promise.all([
        prisma.archetype.count({ where: { version } }),
        prisma.trainingDay.count({ where: { handbook: { version } } }),
        prisma.trainingSection.count({ where: { day: { handbook: { version } } } }),
        prisma.methodologySection.count({ where: { doc: { version } } }),
      ]);

    return ok({
      version,
      quizzes: {
        fast: {
          questionCount: fastQuestionCount,
          optionCount: fastOptionCount,
          imported: fastQuestionCount >= 9 && fastOptionCount >= 9 * 4,
        },
        pro: {
          questionCount: proQuestionCount,
          optionCount: proOptionCount,
          imported: proQuestionCount >= 18 && proOptionCount >= 18 * 4,
        },
      },
      archetypes: {
        count: archetypeCount,
        imported: archetypeCount >= 6,
      },
      trainingHandbook: {
        dayCount: trainingDayCount,
        sectionCount: trainingSectionCount,
        imported: trainingDayCount >= 7 && trainingSectionCount > 0,
      },
      methodology: {
        sectionCount: methodologySectionCount,
        imported: methodologySectionCount > 0,
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get content status error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
