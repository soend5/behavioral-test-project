/**
 * POST /api/coach/customers - 创建客户
 * GET /api/coach/customers - 获取客户列表
 * 
 * POST 使用的门禁函数：
 * - requireCoach() (要求 coach 角色)
 * 
 * GET 使用的门禁函数：
 * - requireCoach() (要求 coach 角色)
 * - 查询时自动过滤 coachId === session.user.id
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ role 必须是 coach 或 admin
 * ✅ coach 只能创建/查看自己的客户
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCoach();
    const body = await request.json();
    const { name, nickname, phone, wechat, qq, note } = body;

    // 创建客户（自动设置 coachId）
    const customer = await prisma.customer.create({
      data: {
        name,
        nickname,
        phone,
        wechat,
        qq,
        note,
        coachId: session.user.id,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.create_customer",
      "customer",
      customer.id,
      {
        name: customer.name,
        nickname: customer.nickname,
      }
    );

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        nickname: customer.nickname,
        coachId: customer.coachId,
        createdAt: customer.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.VALIDATION_ERROR) {
      return fail(error.message, "数据验证失败");
    }
    console.error("Create customer error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireCoach();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const query = searchParams.get("query") || "";
    const status = searchParams.get("status") || "";
    const segment = searchParams.get("segment") || ""; // v1.7: 分层筛选
    const archetype = searchParams.get("archetype") || ""; // v2.1: 画像筛选
    const stage = searchParams.get("stage") || ""; // v2.1: 阶段筛选
    const activity = searchParams.get("activity") || ""; // v2.1: 活动时间筛选

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      coachId: session.user.id, // 严格过滤：只返回自己的客户
    };

    // 搜索条件
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { nickname: { contains: query } },
        { phone: { contains: query } },
      ];
    }

    // v1.7: 分层筛选
    if (segment) {
      where.segments = {
        some: { segment },
      };
    }

    // v2.1: 活动时间筛选
    if (activity) {
      const now = new Date();
      let activityDate: Date | null = null;
      
      if (activity === "7d") {
        activityDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (activity === "14d") {
        activityDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      } else if (activity === "30d") {
        activityDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      if (activityDate && activity !== "older") {
        where.updatedAt = { gte: activityDate };
      } else if (activity === "older") {
        where.updatedAt = { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    // 获取客户列表
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          nickname: true,
          phone: true,
          updatedAt: true,
          _count: {
            select: {
              attempts: {
                where: { submittedAt: { not: null } },
              },
            },
          },
          attempts: {
            where: { submittedAt: { not: null } },
            orderBy: { submittedAt: "desc" },
            take: 1,
            select: {
              id: true,
              submittedAt: true,
              stage: true,
              resultSummaryJson: true,
            },
          },
          segments: {
            select: { segment: true, score: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // 处理状态筛选（客户端筛选）
    let filteredCustomers = customers;
    if (status === "completed") {
      filteredCustomers = customers.filter((c) => c._count.attempts > 0);
    } else if (status === "not_started") {
      filteredCustomers = customers.filter((c) => c._count.attempts === 0);
    }

    // v2.1: 画像筛选
    if (archetype) {
      filteredCustomers = filteredCustomers.filter((c) => {
        if (!c.attempts[0]?.resultSummaryJson) return false;
        try {
          const summary = JSON.parse(c.attempts[0].resultSummaryJson);
          return summary.archetype === archetype;
        } catch {
          return false;
        }
      });
    }

    // v2.1: 阶段筛选
    if (stage) {
      filteredCustomers = filteredCustomers.filter((c) => {
        return c.attempts[0]?.stage === stage;
      });
    }

    // v2.1: 判断高风险
    const isHighRisk = (c: typeof customers[0]) => {
      const segments = c.segments?.map((s) => s.segment) || [];
      if (segments.includes("needs_attention")) return true;
      
      // 超过14天无更新
      const daysSinceUpdate = (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 14) return true;
      
      return false;
    };

    return ok({
      customers: filteredCustomers.map((c) => {
        let archetypeValue: string | null = null;
        try {
          if (c.attempts[0]?.resultSummaryJson) {
            const summary = JSON.parse(c.attempts[0].resultSummaryJson);
            archetypeValue = summary.archetype || null;
          }
        } catch {}

        return {
          id: c.id,
          name: c.name,
          nickname: c.nickname,
          phone: c.phone,
          latestAttempt: c.attempts[0]
            ? {
                id: c.attempts[0].id,
                submittedAt: c.attempts[0].submittedAt,
                status: "completed",
                stage: c.attempts[0].stage,
                archetype: archetypeValue,
              }
            : null,
          segments: c.segments?.map((s) => s.segment) || [],
          isHighRisk: isHighRisk(c), // v2.1: 高风险标记
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
      total: filteredCustomers.length,
      page,
      limit,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get customers error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

