/**
 * v1.8: 训练任务管理 API (Admin)
 * POST - 创建训练任务
 * 
 * 门禁：requireAdmin()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const CreateTaskSchema = z.object({
  planId: z.string().min(1),
  dayNo: z.number().int().min(1).max(30),
  orderNo: z.number().int().min(1).max(10),
  type: z.enum(["read", "reflect", "action"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  content: z.any().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { planId, dayNo, orderNo, type, title, description, content, estimatedMinutes } = parsed.data;

    // 验证计划存在
    const plan = await prisma.trainingPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return fail(ErrorCode.NOT_FOUND, "训练计划不存在", 404);
    }

    // 检查是否超出计划天数
    if (dayNo > plan.durationDays) {
      return fail(ErrorCode.INVALID_INPUT, `任务天数不能超过计划天数 ${plan.durationDays}`, 400);
    }

    const task = await prisma.trainingTask.create({
      data: {
        planId,
        dayNo,
        orderNo,
        type,
        title,
        description,
        contentJson: content ? JSON.stringify(content) : null,
        estimatedMinutes: estimatedMinutes ?? 5,
      },
    });

    await writeAudit(prisma, session.user.id, "training_task.create", "TrainingTask", task.id, { planId, title });

    return ok({
      task: {
        id: task.id,
        planId: task.planId,
        dayNo: task.dayNo,
        orderNo: task.orderNo,
        type: task.type,
        title: task.title,
        description: task.description,
        content: task.contentJson ? JSON.parse(task.contentJson) : null,
        estimatedMinutes: task.estimatedMinutes,
      },
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    // 唯一约束冲突
    if (e?.code === "P2002") {
      return fail(ErrorCode.CONFLICT, "该天数和顺序的任务已存在", 409);
    }
    console.error("POST /api/admin/training/tasks error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
