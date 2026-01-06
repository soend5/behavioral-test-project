/**
 * POST /api/attempt/submit
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (拒绝 completed/expired)
 * - requireAttemptOwnership (验证 attempt 属于该 invite)
 * - assertInviteAllowsSubmit (断言 invite 允许提交)
 * - assertAttemptNotSubmitted (断言 attempt 未提交，幂等性处理)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 * ✅ Ownership：attempt.inviteId === invite.id
 * ✅ 状态机：invite.status 从 'entered' → 'completed'
 * ✅ 幂等性：重复调用返回相同结果
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireInviteByToken,
  requireAttemptOwnership,
  assertInviteAllowsSubmit,
  assertAttemptNotSubmitted,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { calculateScores } from "@/lib/scoring";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, attemptId } = body;

    if (!token || !attemptId) {
      return fail(ErrorCode.BAD_REQUEST, "缺少必要参数：token, attemptId");
    }

    // 使用门禁函数：token → invite 校验（拒绝 completed/expired）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered"],
      includeRelations: false,
    });

    // 使用门禁函数：验证 attempt 属于该 invite
    let attempt = await requireAttemptOwnership(prisma, attemptId, invite.id);

    // 幂等性：如果已提交，返回现有结果
    if (attempt.submittedAt !== null) {
      return ok({
        attemptId: attempt.id,
        submittedAt: attempt.submittedAt,
        result: attempt.resultSummaryJson
          ? JSON.parse(attempt.resultSummaryJson)
          : null,
      });
    }

    // 使用门禁函数：断言 invite 允许提交
    assertInviteAllowsSubmit(invite);

    // 使用门禁函数：断言 attempt 未提交（仅在未提交时检查）
    assertAttemptNotSubmitted(attempt);

    // 检查答案是否完整
    if (!attempt.answersJson) {
      return fail(ErrorCode.BAD_REQUEST, "答案不完整，无法提交");
    }

    const answers = JSON.parse(attempt.answersJson);
    if (Object.keys(answers).length === 0) {
      return fail(ErrorCode.BAD_REQUEST, "答案不完整，无法提交");
    }

    // 获取所有选项用于评分
    const optionIds = Object.values(answers) as string[];
    const options = await prisma.option.findMany({
      where: {
        id: { in: optionIds },
      },
    });

    // 计算分数和标签
    const { scoresJson, tagsJson, stage, resultSummaryJson } =
      await calculateScores(answers, options, attempt.version as "fast" | "pro");

    // 更新 attempt（提交）
    const submittedAt = new Date();
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        submittedAt,
        answersJson: JSON.stringify(answers),
        scoresJson,
        tagsJson,
        stage,
        resultSummaryJson,
        matchedSopId: null, // MVP 暂不匹配 SOP，保留字段
      },
    });

    // 更新 invite 状态：entered -> completed
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "completed" },
    });

    // 写入审计日志（必须包含 invite_id, attempt_id）
    await writeAudit(
      prisma,
      invite.coachId,
      "client.submit_attempt",
      "attempt",
      attemptId,
      {
        inviteId: invite.id,
        attemptId: attemptId,
        customerId: invite.customerId,
      }
    );

    return ok({
      attemptId: attempt.id,
      submittedAt: submittedAt.toISOString(),
      result: JSON.parse(resultSummaryJson),
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
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成，禁止继续操作",
        [ErrorCode.BAD_REQUEST]: "缺少必要参数：token, attemptId",
        [ErrorCode.ATTEMPT_NOT_FOUND]: "测评记录不存在",
        [ErrorCode.FORBIDDEN]: "无权访问此测评记录",
        [ErrorCode.ATTEMPT_ALREADY_SUBMITTED]: "测评已提交，禁止继续操作",
      };
      return fail(error.message, messageMap[error.message] || error.message);
    }
    console.error("Submit attempt error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
