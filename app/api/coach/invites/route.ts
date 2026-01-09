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
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCoach();
    const body = await request.json();
    const { customerId, version, quizVersion, expiresAt } = body;

    if (!customerId || !version) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：customerId, version");
    }

    if (version !== "fast" && version !== "pro") {
      return fail(ErrorCode.VALIDATION_ERROR, "version 必须是 'fast' 或 'pro'");
    }

    let resolvedQuizVersion = typeof quizVersion === "string" ? quizVersion.trim() : "";
    if (!resolvedQuizVersion) {
      try {
        const row = await prisma.systemSetting.findUnique({
          where: { key: "invite_default_quiz_version" },
          select: { value: true },
        });
        resolvedQuizVersion = row?.value || "v1";
      } catch (e) {
        // Backward-compatible: allow invite creation even if system_settings migration isn't applied yet.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
          resolvedQuizVersion = "v1";
        } else {
          throw e;
        }
      }
    }

    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (Number.isNaN(parsedExpiresAt.getTime())) {
        return fail(ErrorCode.VALIDATION_ERROR, "expiresAt 格式错误");
      }
    } else {
      // 默认有效期为一周
      parsedExpiresAt = new Date();
      parsedExpiresAt.setDate(parsedExpiresAt.getDate() + 7);
    }

    // 验证 customer ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    // 校验 quiz 是否存在且为 active（status=inactive 禁止新 invite）
    const quiz = await prisma.quiz.findUnique({
      where: {
        quizVersion_version: {
          quizVersion: resolvedQuizVersion,
          version,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!quiz) {
      return fail(ErrorCode.NOT_FOUND, "题库不存在");
    }
    if (quiz.status !== "active") {
      return fail(
        ErrorCode.VALIDATION_ERROR,
        "题库已停用（inactive），禁止创建新邀请"
      );
    }

    // 生成 token（只返回一次明文）
    const token = generateToken();
    const tokenHash = hashToken(token);

    let invite: { id: string; status: string; customerId: string; version: string; quizVersion: string; expiresAt: Date | null; tokenHash: string };

    try {
      invite = await prisma.$transaction(async (tx) => {
        // 检查是否有同客户同版本的 active invite（并发下由 DB 约束兜底）
        const existingInvite = await tx.invite.findFirst({
          where: {
            customerId,
            version,
            status: "active",
          },
          select: { id: true },
        });

        // 如果有，自动过期旧的
        if (existingInvite) {
          await tx.invite.update({
            where: { id: existingInvite.id },
            data: { status: "expired" },
          });

          await writeAudit(
            tx,
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

        // 创建新邀请
        const created = await tx.invite.create({
          data: {
            tokenHash,
            status: "active",
            customerId,
            coachId: session.user.id,
            version,
            quizVersion: resolvedQuizVersion,
            expiresAt: parsedExpiresAt,
          },
          select: {
            id: true,
            tokenHash: true,
            status: true,
            customerId: true,
            version: true,
            quizVersion: true,
            expiresAt: true,
          },
        });

        await writeAudit(
          tx,
          session.user.id,
          "coach.create_invite",
          "invite",
          created.id,
          {
            customerId,
            version,
            quizVersion: resolvedQuizVersion,
          }
        );

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return fail(
          ErrorCode.CONFLICT,
          "该客户同版本已有 active 邀请（可能是并发创建），请刷新后重试"
        );
      }
      throw error;
    }

    // 构建完整 URL
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
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
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "题库不存在");
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

