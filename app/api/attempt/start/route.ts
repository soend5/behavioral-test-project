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
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireInviteByToken,
  requireAttemptByInvite,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return fail(ErrorCode.BAD_REQUEST, "缺少 token 参数");
    }

    // 使用门禁函数：token → invite 校验（拒绝 completed/expired）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered"],
      includeRelations: false,
    });

    // 使用门禁函数：幂等性检查（查找未提交的 attempt）
    const existingAttempt = await requireAttemptByInvite(prisma, invite.id);

    if (existingAttempt) {
      // 幂等：返回现有 attempt
      return ok({
        attemptId: existingAttempt.id,
        quizVersion: existingAttempt.quizVersion,
        version: existingAttempt.version,
      });
    }

    // 更新 invite 状态：active -> entered
    if (invite.status === "active") {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "entered" },
      });
    }

    // 创建新的 attempt
    const attempt = await prisma.attempt.create({
      data: {
        inviteId: invite.id,
        customerId: invite.customerId,
        coachId: invite.coachId,
        version: invite.version,
        quizVersion: invite.quizVersion,
        startedAt: new Date(),
      },
    });

    // 写入审计日志
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
