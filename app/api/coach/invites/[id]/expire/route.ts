/**
 * POST /api/coach/invites/:id/expire - 失效邀请
 * 
 * 使用的门禁函数：
 * - requireCoachOwnsInvite() (验证 ownership)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ coach 只能失效自己的邀请
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachOwnsInvite } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const inviteId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsInvite(prisma, session.user.id, inviteId);

    // 检查邀请状态
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return fail(ErrorCode.INVITE_NOT_FOUND, "邀请不存在");
    }

    if (invite.status === "expired" || invite.status === "completed") {
      return fail(ErrorCode.INVITE_ALREADY_EXPIRED, "邀请已失效或已完成");
    }

    // 更新邀请状态为 expired
    const updatedInvite = await prisma.invite.update({
      where: { id: inviteId },
      data: { status: "expired" },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.expire_invite",
      "invite",
      inviteId,
      {
        previousStatus: invite.status,
      }
    );

    return ok({
      invite: {
        id: updatedInvite.id,
        status: updatedInvite.status,
        updatedAt: updatedInvite.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.INVITE_NOT_FOUND) {
      return fail(error.message, "邀请不存在");
    }
    if (error.message === ErrorCode.INVITE_ALREADY_EXPIRED) {
      return fail(error.message, "邀请已失效或已完成");
    }
    console.error("Expire invite error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

