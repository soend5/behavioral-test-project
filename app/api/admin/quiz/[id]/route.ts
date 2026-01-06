/**
 * PATCH /api/admin/quiz/:id - 更新题库
 * 
 * 使用的门禁函数：
 * - requireAdmin() (要求 admin 角色)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ role 必须是 admin
 * ✅ 版本保护：已被使用的 quiz_version 禁止破坏式修改
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const quizId = params.id;
    const body = await request.json();
    const { title, status } = body;

    // 获取现有 quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return fail(ErrorCode.NOT_FOUND, "题库不存在");
    }

    // 版本保护：检查是否有 invites 或 attempts 使用该 quiz_version
    const inviteCount = await prisma.invite.count({
      where: {
        quizVersion: quiz.quizVersion,
        version: quiz.version,
      },
    });

    const attemptCount = await prisma.attempt.count({
      where: {
        quizVersion: quiz.quizVersion,
        version: quiz.version,
      },
    });

    // 如果已被使用，禁止修改 version 和 quizVersion
    if (inviteCount > 0 || attemptCount > 0) {
      // 只允许修改 title 和 status
      if (body.version !== undefined || body.quizVersion !== undefined) {
        return fail(
          ErrorCode.VALIDATION_ERROR,
          `该 quiz_version (${quiz.quizVersion}) 已被使用，禁止修改 version 或 quizVersion。请创建新版本。`
        );
      }
    }

    // 更新题库
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        status,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_quiz",
      "quiz",
      quizId,
      {
        previousTitle: quiz.title,
        previousStatus: quiz.status,
        newTitle: title,
        newStatus: status,
      }
    );

    return ok({
      quiz: {
        id: updatedQuiz.id,
        version: updatedQuiz.version,
        quizVersion: updatedQuiz.quizVersion,
        title: updatedQuiz.title,
        status: updatedQuiz.status,
        updatedAt: updatedQuiz.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "题库不存在");
    }
    console.error("Update quiz error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

