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

    // 获取客户列表（使用 _count 优化查询，避免 N+1）
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

    return ok({
      customers: filteredCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        nickname: c.nickname,
        phone: c.phone,
        latestAttempt: c.attempts[0]
          ? {
              id: c.attempts[0].id,
              submittedAt: c.attempts[0].submittedAt,
              status: "completed",
            }
          : null,
        segments: c.segments?.map((s) => s.segment) || [], // v1.7: 返回分层标签
      })),
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

