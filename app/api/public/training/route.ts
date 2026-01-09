/**
 * v1.8: 客户训练 API
 * GET  - 获取训练进度
 * POST - 开始训练
 * 
 * 无需登录，通过 token 验证
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { hashToken } from "@/lib/token";

async function getCustomerByToken(token: string) {
  const tokenHash = hashToken(token);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: {
      customer: true,
      attempts: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });
  return invite;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 token 参数", 400);
    }

    const invite = await getCustomerByToken(token);
    if (!invite) {
      return fail(ErrorCode.NOT_FOUND, "邀请不存在", 404);
    }

    const customerId = invite.customerId;

    // 获取客户的训练报名
    const enrollment = await prisma.trainingEnrollment.findFirst({
      where: {
        customerId,
        status: { in: ["active", "completed"] },
      },
      include: {
        plan: {
          include: {
            tasks: {
              orderBy: [{ dayNo: "asc" }, { orderNo: "asc" }],
            },
          },
        },
        completions: true,
      },
      orderBy: { startedAt: "desc" },
    });

    if (!enrollment) {
      // 获取可用的训练计划
      const availablePlans = await prisma.trainingPlan.findMany({
        where: { status: "active" },
        select: {
          id: true,
          name: true,
          description: true,
          durationDays: true,
          _count: { select: { tasks: true } },
        },
      });

      return ok({
        hasEnrollment: false,
        availablePlans: availablePlans.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          durationDays: p.durationDays,
          taskCount: p._count.tasks,
        })),
      });
    }

    // 计算当前天数
    const startDate = new Date(enrollment.startedAt);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(daysSinceStart + 1, enrollment.plan.durationDays);

    // 组装任务完成状态
    const completedTaskIds = new Set(enrollment.completions.map((c) => c.taskId));
    const tasksByDay: Record<number, any[]> = {};

    for (const task of enrollment.plan.tasks) {
      if (!tasksByDay[task.dayNo]) {
        tasksByDay[task.dayNo] = [];
      }
      tasksByDay[task.dayNo].push({
        id: task.id,
        orderNo: task.orderNo,
        type: task.type,
        title: task.title,
        description: task.description,
        content: task.contentJson ? JSON.parse(task.contentJson) : null,
        estimatedMinutes: task.estimatedMinutes,
        completed: completedTaskIds.has(task.id),
      });
    }

    // 计算进度
    const totalTasks = enrollment.plan.tasks.length;
    const completedTasks = enrollment.completions.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return ok({
      hasEnrollment: true,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        startedAt: enrollment.startedAt.toISOString(),
        completedAt: enrollment.completedAt?.toISOString() ?? null,
      },
      plan: {
        id: enrollment.plan.id,
        name: enrollment.plan.name,
        description: enrollment.plan.description,
        durationDays: enrollment.plan.durationDays,
      },
      currentDay,
      progress,
      completedTasks,
      totalTasks,
      tasksByDay,
    });
  } catch (e: any) {
    console.error("GET /api/public/training error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const { token, planId } = body as { token?: string; planId?: string };

    if (!token) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 token", 400);
    }
    if (!planId) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 planId", 400);
    }

    const invite = await getCustomerByToken(token);
    if (!invite) {
      return fail(ErrorCode.NOT_FOUND, "邀请不存在", 404);
    }

    const customerId = invite.customerId;
    const attemptId = invite.attempts[0]?.id ?? null;

    // 检查计划是否存在
    const plan = await prisma.trainingPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.status !== "active") {
      return fail(ErrorCode.NOT_FOUND, "训练计划不存在或已停用", 404);
    }

    // 检查是否已报名
    const existingEnrollment = await prisma.trainingEnrollment.findUnique({
      where: { planId_customerId: { planId, customerId } },
    });

    if (existingEnrollment) {
      return fail(ErrorCode.CONFLICT, "已报名该训练计划", 409);
    }

    // 创建报名
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        planId,
        customerId,
        attemptId,
        startedAt: new Date(),
      },
    });

    return ok({
      enrollment: {
        id: enrollment.id,
        planId: enrollment.planId,
        startedAt: enrollment.startedAt.toISOString(),
        status: enrollment.status,
      },
    });
  } catch (e: any) {
    console.error("POST /api/public/training error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
