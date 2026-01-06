/**
 * GET /api/public/invite/resolve
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (允许 completed 状态，因为这是查看邀请信息)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInviteByToken } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return fail(ErrorCode.BAD_REQUEST, "缺少 token 参数");
    }

    // 使用门禁函数：token → invite 校验（允许 completed，因为这是查看邀请信息）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered", "completed", "expired"],
      includeRelations: true,
    });

    return ok({
      invite: {
        id: invite.id,
        status: invite.status,
        customer: {
          id: invite.customer.id,
          nickname: invite.customer.nickname,
          name: invite.customer.name,
        },
        coach: {
          id: invite.coach.id,
          username: invite.coach.username,
        },
        version: invite.version,
        quizVersion: invite.quizVersion,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.INVITE_INVALID ||
      error.message === ErrorCode.INVITE_EXPIRED_OR_COMPLETED ||
      error.message === ErrorCode.BAD_REQUEST
    ) {
      const messageMap: Record<string, string> = {
        [ErrorCode.INVITE_INVALID]: "邀请 token 无效或不存在",
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成",
        [ErrorCode.BAD_REQUEST]: "缺少 token 参数",
      };
      return fail(error.message, messageMap[error.message] || error.message);
    }
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
