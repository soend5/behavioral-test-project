/**
 * POST /api/attempt/answer
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (拒绝 completed/expired)
 * - requireAttemptOwnership (验证 attempt 属于该 invite)
 * - assertInviteAllowsAnswer (断言 invite 允许答题)
 * - assertAttemptNotSubmitted (断言 attempt 未提交)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 * ✅ Ownership：attempt.inviteId === invite.id
 * ✅ 状态校验：invite.status !== 'completed' && attempt.submittedAt === null
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireInviteByToken,
  requireAttemptOwnership,
  assertInviteAllowsAnswer,
  assertAttemptNotSubmitted,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, attemptId, answers } = body;

    if (!token || !attemptId || !answers) {
      return fail(ErrorCode.BAD_REQUEST, "缺少必要参数：token, attemptId, answers");
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return fail(ErrorCode.VALIDATION_ERROR, "answers 必须是非空数组");
    }

    // 使用门禁函数：token → invite 校验（拒绝 completed/expired）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered"],
      includeRelations: false,
    });

    // 使用门禁函数：断言 invite 允许答题
    assertInviteAllowsAnswer(invite);

    // 使用门禁函数：验证 attempt 属于该 invite
    const attempt = await requireAttemptOwnership(prisma, attemptId, invite.id);

    // 使用门禁函数：断言 attempt 未提交
    assertAttemptNotSubmitted(attempt);

    // 验证答案格式和题目/选项是否存在
    const questionIds = answers.map((a: any) => a.questionId);
    const optionIds = answers.map((a: any) => a.optionId);

    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        status: "active",
      },
    });

    const options = await prisma.option.findMany({
      where: {
        id: { in: optionIds },
      },
      include: {
        question: true,
      },
    });

    // 验证每个答案的 questionId 和 optionId 是否匹配
    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      const option = options.find((o) => o.id === answer.optionId);

      if (!question) {
        return fail(
          ErrorCode.VALIDATION_ERROR,
          `题目 ${answer.questionId} 不存在或已禁用`
        );
      }

      if (!option) {
        return fail(ErrorCode.VALIDATION_ERROR, `选项 ${answer.optionId} 不存在`);
      }

      if (option.questionId !== answer.questionId) {
        return fail(
          ErrorCode.VALIDATION_ERROR,
          `选项 ${answer.optionId} 不属于题目 ${answer.questionId}`
        );
      }
    }

    // 获取现有答案（如果有）
    let existingAnswers: Record<string, string> = {};
    if (attempt.answersJson) {
      try {
        existingAnswers = JSON.parse(attempt.answersJson);
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 合并新答案
    for (const answer of answers) {
      existingAnswers[answer.questionId] = answer.optionId;
    }

    // 更新 attempt
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        answersJson: JSON.stringify(existingAnswers),
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      invite.coachId,
      "attempt.answer",
      "attempt",
      attemptId,
      {
        inviteId: invite.id,
        answeredCount: Object.keys(existingAnswers).length,
      }
    );

    return ok({
      saved: true,
      answeredCount: Object.keys(existingAnswers).length,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.INVITE_INVALID ||
      error.message === ErrorCode.INVITE_EXPIRED_OR_COMPLETED ||
      error.message === ErrorCode.BAD_REQUEST ||
      error.message === ErrorCode.ATTEMPT_NOT_FOUND ||
      error.message === ErrorCode.FORBIDDEN ||
      error.message === ErrorCode.ATTEMPT_ALREADY_SUBMITTED
    ) {
      const messageMap: Record<string, string> = {
        [ErrorCode.INVITE_INVALID]: "邀请 token 无效或不存在",
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成，禁止继续答题",
        [ErrorCode.BAD_REQUEST]: "缺少必要参数：token, attemptId, answers",
        [ErrorCode.ATTEMPT_NOT_FOUND]: "测评记录不存在",
        [ErrorCode.FORBIDDEN]: "无权访问此测评记录",
        [ErrorCode.ATTEMPT_ALREADY_SUBMITTED]: "测评已提交，禁止继续答题",
      };
      return fail(error.message, messageMap[error.message] || error.message);
    }
    console.error("Answer attempt error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
