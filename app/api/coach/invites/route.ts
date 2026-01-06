/**
 * POST /api/coach/invites - 创建邀请
 * GET /api/coach/invites - 获取邀请列表
 * 
 * POST 使用的门禁函数：
 * - requireCoach() (要求 coach 角色)
 * - requireCoachOwnsCustomer() (验证 customer ownership)
 * 
 * GET 使用的门禁函数：
 * - requireCoach() (要求 coach 角色)
 * - 查询时自动过滤 coachId === session.user.id
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ coach 只能为自己的客户创建邀请
 * ✅ 同客户同版本只能有1个 active invite（自动过期旧的）
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach, requireCoachOwnsCustomer } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { generateToken, hashToken } from "@/lib/token";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCoach();
    const body = await request.json();
    const { customerId, version, quizVersion, expiresAt } = body;

    if (!customerId || !version || !quizVersion) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：customerId, version, quizVersion");
    }

    // 验证 customer ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    // 检查是否有同客户同版本的 active invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        customerId,
        version,
        status: "active",
      },
    });

    // 如果有，自动过期旧的
    if (existingInvite) {
      await prisma.invite.update({
        where: { id: existingInvite.id },
        data: { status: "expired" },
      });

      // 写入审计日志
      await writeAudit(
        prisma,
        session.user.id,
        "coach.expire_invite",
        "invite",
        existingInvite.id,
        {
          reason: "auto_expired_by_new_invite",
          newInviteCustomerId: customerId,
          newInviteVersion: version,
        }
      );
    }

    // 生成 token（只返回一次明文）
    const token = generateToken();
    const tokenHash = hashToken(token);

    // 创建新邀请
    const invite = await prisma.invite.create({
      data: {
        tokenHash,
        status: "active",
        customerId,
        coachId: session.user.id,
        version,
        quizVersion,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.create_invite",
      "invite",
      invite.id,
      {
        customerId,
        version,
        quizVersion,
      }
    );

    // 构建完整 URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/t/${token}`;

    return ok({
      invite: {
        id: invite.id,
        token: token, // 仅返回一次明文
        tokenHash: tokenHash, // hash 也返回（用于确认）
        status: invite.status,
        customerId: invite.customerId,
        version: invite.version,
        quizVersion: invite.quizVersion,
        expiresAt: invite.expiresAt,
        url: inviteUrl,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND) {
      return fail(error.message, "客户不存在");
    }
    console.error("Create invite error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireCoach();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const customerId = searchParams.get("customer_id") || "";

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      coachId: session.user.id, // 严格过滤：只返回自己的邀请
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [invites, total] = await Promise.all([
      prisma.invite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              nickname: true,
              name: true,
            },
          },
        },
      }),
      prisma.invite.count({ where }),
    ]);

    return ok({
      invites: invites.map((invite) => ({
        id: invite.id,
        tokenHash: invite.tokenHash, // 不返回原始 token
        status: invite.status,
        customer: invite.customer,
        version: invite.version,
        quizVersion: invite.quizVersion,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get invites error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

