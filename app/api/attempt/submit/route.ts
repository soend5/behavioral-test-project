/**
 * POST /api/attempt/submit
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (拒绝 completed/expired)
 * - requireAttemptOwnership (验证 attempt 属于该 invite)
 * - assertInviteAllowsSubmit (断言 invite 允许提交)
 * - 通过 updateMany + submittedAt=null 实现并发幂等
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
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { calculateScores } from "@/lib/scoring";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { safeJsonParse } from "@/lib/json";
import { z } from "zod";

const SubmitAttemptBodySchema = z.object({
  token: z.string().min(1),
  attemptId: z.string().min(1),
});

const AnswersSchema = z.record(z.string().min(1), z.string().min(1));

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.BAD_REQUEST, "请求体必须为 JSON");
    }

    const parsedBody = SubmitAttemptBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return fail(ErrorCode.BAD_REQUEST, "缺少必要参数：token, attemptId");
    }

    const { token, attemptId } = parsedBody.data;

    const txResult = await prisma.$transaction(async (tx) => {
      const invite = await requireInviteByToken(tx, token, {
        allowStatuses: ["active", "entered"],
        includeRelations: false,
      });

      assertInviteAllowsSubmit(invite);

      const attempt = await requireAttemptOwnership(tx, attemptId, invite.id);
      if (attempt.submittedAt !== null) {
        return {
          status: "already_submitted" as const,
          attemptId: attempt.id,
          submittedAt: attempt.submittedAt,
          resultSummaryJson: attempt.resultSummaryJson,
        };
      }

      const submittedAt = new Date();
      const locked = await tx.attempt.updateMany({
        where: {
          id: attemptId,
          submittedAt: null,
        },
        data: {
          submittedAt,
        },
      });

      if (locked.count === 0) {
        const existingAttempt = await tx.attempt.findUnique({
          where: { id: attemptId },
          select: {
            id: true,
            inviteId: true,
            submittedAt: true,
            resultSummaryJson: true,
          },
        });

        if (!existingAttempt) {
          throw new Error(ErrorCode.ATTEMPT_NOT_FOUND);
        }

        if (existingAttempt.inviteId !== invite.id) {
          throw new Error(ErrorCode.FORBIDDEN);
        }

        return {
          status: "already_submitted" as const,
          attemptId: existingAttempt.id,
          submittedAt: existingAttempt.submittedAt,
          resultSummaryJson: existingAttempt.resultSummaryJson,
        };
      }

      const lockedAttempt = await tx.attempt.findUnique({
        where: { id: attemptId },
      });

      if (!lockedAttempt) {
        throw new Error(ErrorCode.ATTEMPT_NOT_FOUND);
      }

      if (lockedAttempt.inviteId !== invite.id) {
        throw new Error(ErrorCode.FORBIDDEN);
      }

      if (!lockedAttempt.answersJson) {
        throw new Error(ErrorCode.BAD_REQUEST);
      }

      let answersRaw: unknown;
      try {
        answersRaw = JSON.parse(lockedAttempt.answersJson);
      } catch {
        throw new Error(ErrorCode.BAD_REQUEST);
      }

      const parsedAnswers = AnswersSchema.safeParse(answersRaw);
      if (!parsedAnswers.success || Object.keys(parsedAnswers.data).length === 0) {
        throw new Error(ErrorCode.BAD_REQUEST);
      }

      const answers = parsedAnswers.data;

      const quiz = await tx.quiz.findUnique({
        where: {
          quizVersion_version: {
            quizVersion: invite.quizVersion,
            version: invite.version,
          },
        },
        select: { id: true, status: true },
      });

      if (!quiz || quiz.status !== "active") {
        throw new Error(ErrorCode.NOT_FOUND);
      }

      const optionIds = Array.from(new Set(Object.values(answers)));
      const options = await tx.option.findMany({
        where: {
          id: { in: optionIds },
          question: {
            quizId: quiz.id,
            status: "active",
          },
        },
        select: {
          id: true,
          questionId: true,
          scorePayloadJson: true,
        },
      });

      if (options.length !== optionIds.length) {
        throw new Error(ErrorCode.VALIDATION_ERROR);
      }

      const optionMap = new Map(options.map((o) => [o.id, o]));
      for (const [questionId, optionId] of Object.entries(answers)) {
        const option = optionMap.get(optionId);
        if (!option || option.questionId !== questionId) {
          throw new Error(ErrorCode.VALIDATION_ERROR);
        }
      }

      const attemptVersion =
        lockedAttempt.version === "fast" || lockedAttempt.version === "pro"
          ? lockedAttempt.version
          : null;
      if (!attemptVersion) {
        throw new Error(ErrorCode.INTERNAL_ERROR);
      }

      const { scoresJson, tagsJson, stage, resultSummaryJson } =
        await calculateScores(answers, options, attemptVersion);

      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          answersJson: JSON.stringify(answers),
          scoresJson,
          tagsJson,
          stage,
          resultSummaryJson,
          matchedSopId: null, // MVP 暂不匹配 SOP，保留字段
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "completed" },
      });

      return {
        status: "submitted" as const,
        attemptId,
        submittedAt,
        resultSummaryJson,
        coachId: invite.coachId,
        inviteId: invite.id,
        customerId: invite.customerId,
      };
    });

    if (txResult.status === "already_submitted") {
      return ok({
        attemptId: txResult.attemptId,
        submittedAt: txResult.submittedAt?.toISOString() ?? null,
        result: txResult.resultSummaryJson
          ? safeJsonParse(txResult.resultSummaryJson)
          : null,
      });
    }

    await writeAudit(prisma, txResult.coachId, "client.submit_attempt", "attempt", attemptId, {
      inviteId: txResult.inviteId,
      attemptId,
      customerId: txResult.customerId,
    });

    return ok({
      attemptId,
      submittedAt: txResult.submittedAt.toISOString(),
      result: safeJsonParse(txResult.resultSummaryJson),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.INVITE_INVALID ||
      error.message === ErrorCode.INVITE_EXPIRED_OR_COMPLETED ||
      error.message === ErrorCode.BAD_REQUEST ||
      error.message === ErrorCode.NOT_FOUND ||
      error.message === ErrorCode.VALIDATION_ERROR ||
      error.message === ErrorCode.ATTEMPT_NOT_FOUND ||
      error.message === ErrorCode.FORBIDDEN ||
      error.message === ErrorCode.ATTEMPT_ALREADY_SUBMITTED
    ) {
      const messageMap: Record<string, string> = {
        [ErrorCode.INVITE_INVALID]: "邀请 token 无效或不存在",
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成，禁止继续操作",
        [ErrorCode.BAD_REQUEST]: "答案不完整，无法提交",
        [ErrorCode.NOT_FOUND]: "未找到对应的题库",
        [ErrorCode.VALIDATION_ERROR]: "答案包含无效选项",
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
