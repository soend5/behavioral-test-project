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
import { z } from "zod";

const DeleteSchema = z.object({
  confirmText: z.literal("确认删除"),
});

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

export async function DELETE(
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

    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.VALIDATION_ERROR, "请手动输入“确认删除”以继续");
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
    if (!quiz) {
      return fail(ErrorCode.NOT_FOUND, "题库不存在");
    }

    const activeInviteCount = await prisma.invite.count({
      where: {
        quizVersion: quiz.quizVersion,
        version: quiz.version,
        status: { in: ["active", "entered"] },
      },
    });

    const inProgressAttemptCount = await prisma.attempt.count({
      where: {
        quizVersion: quiz.quizVersion,
        version: quiz.version,
        submittedAt: null,
      },
    });

    if (activeInviteCount > 0 || inProgressAttemptCount > 0) {
      return fail(
        ErrorCode.VALIDATION_ERROR,
        "该题库仍存在未完成的邀请/测评进行中，无法删除。请先将相关邀请设为失效或等待完成。"
      );
    }

    const updated = await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: "deleted" },
    });

    await writeAudit(prisma, session.user.id, "admin.delete_quiz", "quiz", quiz.id, {
      quizVersion: quiz.quizVersion,
      version: quiz.version,
      previousStatus: quiz.status,
      newStatus: updated.status,
    });

    return ok({
      quiz: {
        id: updated.id,
        version: updated.version,
        quizVersion: updated.quizVersion,
        title: updated.title,
        status: updated.status,
        updatedAt: updated.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "题库不存在");
    }
    console.error("Delete quiz error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

