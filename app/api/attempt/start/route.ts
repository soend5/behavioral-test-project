/**
 * POST /api/attempt/start
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (拒绝 completed/expired)
 * - requireAttemptByInvite (幂等性检查)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 * ✅ 状态机：invite.status 从 'active' → 'entered'
 * ✅ 幂等性：重复调用返回相同的 attemptId
 * ✅ 速率限制：每分钟 30 次
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  requireInviteByToken,
  requireAttemptByInvite,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const StartAttemptBodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // 速率限制检查
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(`attempt-start:${clientId}`, RATE_LIMITS.public);
  if (!rateLimitResult.success) {
    return fail(ErrorCode.BAD_REQUEST, "请求过于频繁，请稍后再试");
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.BAD_REQUEST, "请求体必须为 JSON");
    }

    const parsedBody = StartAttemptBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return fail(ErrorCode.BAD_REQUEST, "缺少 token 参数");
    }
    const { token } = parsedBody.data;

    // 使用门禁函数：token → invite 校验（拒绝 completed/expired）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered"],
      includeRelations: false,
    });

    let attempt: { id: string; quizVersion: string; version: string };
    let created = false;

    try {
      const txResult = await prisma.$transaction(async (tx) => {
        const existingAttempt = await requireAttemptByInvite(tx, invite.id);
        if (existingAttempt) {
          return { attempt: existingAttempt, created: false };
        }

        if (invite.status === "active") {
          await tx.invite.update({
            where: { id: invite.id },
            data: { status: "entered" },
          });
        }

        const createdAttempt = await tx.attempt.create({
          data: {
            inviteId: invite.id,
            customerId: invite.customerId,
            coachId: invite.coachId,
            version: invite.version,
            quizVersion: invite.quizVersion,
            startedAt: new Date(),
          },
          select: { id: true, quizVersion: true, version: true },
        });

        return { attempt: createdAttempt, created: true };
      });

      attempt = txResult.attempt;
      created = txResult.created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingAttempt = await requireAttemptByInvite(prisma, invite.id);
        if (existingAttempt) {
          attempt = existingAttempt;
          created = false;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // 写入审计日志
    if (created) {
      await writeAudit(
        prisma,
        invite.coachId,
        "attempt.start",
        "attempt",
        attempt.id,
        {
          inviteId: invite.id,
          customerId: invite.customerId,
        }
      );
    }

    return ok({
      attemptId: attempt.id,
      quizVersion: attempt.quizVersion,
      version: attempt.version,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.INVITE_INVALID ||
      error.message === ErrorCode.INVITE_EXPIRED_OR_COMPLETED ||
      error.message === ErrorCode.BAD_REQUEST
    ) {
      const messageMap: Record<string, string> = {
        [ErrorCode.INVITE_INVALID]: "邀请 token 无效或不存在",
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成，禁止启动新测评",
        [ErrorCode.BAD_REQUEST]: "缺少 token 参数",
      };
      return fail(error.message, messageMap[error.message] || error.message);
    }
    console.error("Start attempt error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
