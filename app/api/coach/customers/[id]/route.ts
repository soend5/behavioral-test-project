/**
 * GET /api/coach/customers/:id - 获取客户详情
 * PATCH /api/coach/customers/:id - 更新客户
 * 
 * GET 使用的门禁函数：
 * - requireCoachOwnsCustomer() (验证 ownership)
 * 
 * PATCH 使用的门禁函数：
 * - requireCoachOwnsCustomer() (验证 ownership)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ coach 只能访问自己的客户
 * ✅ 聚合输出：customer + latest_attempt + attempt_timeline + coach_tags + realtime_panel
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachOwnsCustomer } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { matchSOP, getDefaultRealtimePanel } from "@/lib/sop-matcher";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { safeJsonParseWithSchema } from "@/lib/json";
import { z } from "zod";

const StringArraySchema = z.array(z.string());

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    // 获取客户基础信息
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return fail(ErrorCode.CUSTOMER_NOT_FOUND, "客户不存在");
    }

    // 获取最新一次已提交的 attempt
    const latestAttempt = await prisma.attempt.findFirst({
      where: {
        customerId,
        submittedAt: { not: null },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // 获取所有 attempt（时间线）
    const attempts = await prisma.attempt.findMany({
      where: {
        customerId,
        submittedAt: { not: null },
      },
      orderBy: {
        submittedAt: "desc",
      },
      include: {
        invite: {
          select: {
            version: true,
            quizVersion: true,
          },
        },
      },
    });

    // 获取助教标签
    const coachTags = await prisma.coachTag.findMany({
      where: {
        customerId,
        coachId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 构建 realtime_panel
    let realtimePanel: any = null;

    if (latestAttempt) {
      // 有 attempt：基于 stage + tags 匹配 SOP
      const systemTags = latestAttempt.tagsJson
        ? safeJsonParseWithSchema(latestAttempt.tagsJson, StringArraySchema, [])
        : [];
      const coachTagKeys = coachTags.map((t) => t.tagKey);
      const allTags = [...systemTags, ...coachTagKeys];

      const matchedSOP = await matchSOP(
        prisma,
        latestAttempt.stage || "pre",
        allTags
      );

      if (matchedSOP) {
        realtimePanel = {
          stage: matchedSOP.stage,
          stateSummary: matchedSOP.stateSummary,
          coreGoal: matchedSOP.coreGoal,
          strategyList: matchedSOP.strategyList.slice(0, 3), // 最多3条
          forbiddenList: matchedSOP.forbiddenList,
        };
      } else {
        // 如果没有匹配到 SOP，使用默认 panel
        realtimePanel = await getDefaultRealtimePanel(
          prisma,
          latestAttempt.stage || "pre"
        );
      }
    } else {
      // 没有 attempt：返回默认 panel
      realtimePanel = await getDefaultRealtimePanel(prisma, "pre");
    }

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.view_customer",
      "customer",
      customerId,
      null
    );

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        nickname: customer.nickname,
        phone: customer.phone,
        wechat: customer.wechat,
        qq: customer.qq,
        note: customer.note,
        coachId: customer.coachId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      latestAttempt: latestAttempt
        ? {
            id: latestAttempt.id,
            version: latestAttempt.version,
            submittedAt: latestAttempt.submittedAt,
            tags: latestAttempt.tagsJson
              ? safeJsonParseWithSchema(latestAttempt.tagsJson, StringArraySchema, [])
              : [],
            stage: latestAttempt.stage,
          }
        : null,
      attemptTimeline: attempts.map((a) => ({
        id: a.id,
        version: a.version,
        quizVersion: a.quizVersion,
        submittedAt: a.submittedAt,
        tags: safeJsonParseWithSchema(a.tagsJson, StringArraySchema, []),
        stage: a.stage,
      })),
      coachTags: coachTags.map((t) => ({
        id: t.id,
        tagKey: t.tagKey,
        createdAt: t.createdAt,
      })),
      realtimePanel,
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
    console.error("Get customer error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);
    const body = await request.json();
    const { name, nickname, phone, wechat, qq, note } = body;

    // 更新客户
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name,
        nickname,
        phone,
        wechat,
        qq,
        note,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.update_customer",
      "customer",
      customerId,
      {
        updatedFields: Object.keys(body),
      }
    );

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        nickname: customer.nickname,
        updatedAt: customer.updatedAt,
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
    console.error("Update customer error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

