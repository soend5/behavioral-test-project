/**
 * GET /api/coach/todos
 * 
 * 获取助教的待办事项列表
 * - 新完成的测评（最近 24 小时内提交）
 * - 进行中的测评（已开始但未完成）
 * - 即将过期的邀请（24 小时内过期）
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

type TodoItem = {
  type: "new_completion" | "in_progress" | "expiring_soon";
  priority: number;
  customerId: string;
  customerName: string;
  inviteId: string;
  timestamp: string;
  actionUrl: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireCoach();
    const coachId = session.user.id;

    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const todos: TodoItem[] = [];

    // 1. 新完成的测评（最近 24 小时内提交）
    const newCompletions = await prisma.attempt.findMany({
      where: {
        coachId,
        submittedAt: {
          gte: past24h,
          not: null,
        },
      },
      include: {
        customer: {
          select: { id: true, nickname: true, name: true },
        },
        invite: {
          select: { id: true },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 20,
    });

    for (const attempt of newCompletions) {
      todos.push({
        type: "new_completion",
        priority: 1,
        customerId: attempt.customer.id,
        customerName: attempt.customer.nickname || attempt.customer.name || "未命名",
        inviteId: attempt.invite.id,
        timestamp: attempt.submittedAt?.toISOString() || now.toISOString(),
        actionUrl: `/coach/clients/${attempt.customer.id}`,
      });
    }

    // 2. 进行中的测评（已开始但未完成）
    const inProgress = await prisma.invite.findMany({
      where: {
        coachId,
        status: "entered",
      },
      include: {
        customer: {
          select: { id: true, nickname: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    for (const invite of inProgress) {
      todos.push({
        type: "in_progress",
        priority: 2,
        customerId: invite.customer.id,
        customerName: invite.customer.nickname || invite.customer.name || "未命名",
        inviteId: invite.id,
        timestamp: invite.createdAt.toISOString(),
        actionUrl: `/coach/clients/${invite.customer.id}`,
      });
    }

    // 3. 即将过期的邀请（24 小时内过期，且状态为 active）
    const expiringSoon = await prisma.invite.findMany({
      where: {
        coachId,
        status: "active",
        expiresAt: {
          gte: now,
          lte: next24h,
        },
      },
      include: {
        customer: {
          select: { id: true, nickname: true, name: true },
        },
      },
      orderBy: { expiresAt: "asc" },
      take: 20,
    });

    for (const invite of expiringSoon) {
      todos.push({
        type: "expiring_soon",
        priority: 3,
        customerId: invite.customer.id,
        customerName: invite.customer.nickname || invite.customer.name || "未命名",
        inviteId: invite.id,
        timestamp: invite.expiresAt?.toISOString() || now.toISOString(),
        actionUrl: `/coach/clients/${invite.customer.id}`,
      });
    }

    // 按优先级排序
    todos.sort((a, b) => a.priority - b.priority);

    return ok({
      todos,
      summary: {
        newCompletions: newCompletions.length,
        inProgress: inProgress.length,
        expiringSoon: expiringSoon.length,
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, "请先登录");
    }
    if (error.message === ErrorCode.FORBIDDEN) {
      return fail(ErrorCode.FORBIDDEN, "无权访问");
    }
    console.error("Get todos error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
