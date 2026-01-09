/**
 * v1.8: 训练任务单项操作 API (Admin)
 * PATCH  - 更新任务
 * DELETE - 删除任务
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

const UpdateTaskSchema = z.object({
  dayNo: z.number().int().min(1).max(30).optional(),
  orderNo: z.number().int().min(1).max(10).optional(),
  type: z.enum(["read", "reflect", "action"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  content: z.any().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;

    const existing = await prisma.trainingTask.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "训练任务不存在", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { dayNo, orderNo, type, title, description, content, estimatedMinutes } = parsed.data;

    // 检查天数是否超出计划
    if (dayNo && dayNo > existing.plan.durationDays) {
      return fail(ErrorCode.INVALID_INPUT, `任务天数不能超过计划天数 ${existing.plan.durationDays}`, 400);
    }

    const task = await prisma.trainingTask.update({
      where: { id },
      data: {
        ...(dayNo !== undefined && { dayNo }),
        ...(orderNo !== undefined && { orderNo }),
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { contentJson: content ? JSON.stringify(content) : null }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
      },
    });

    await writeAudit(prisma, session.user.id, "training_task.update", "TrainingTask", id, parsed.data);

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
    if (e?.code === "P2002") {
      return fail(ErrorCode.CONFLICT, "该天数和顺序的任务已存在", 409);
    }
    console.error("PATCH /api/admin/training/tasks/[id] error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;

    const existing = await prisma.trainingTask.findUnique({ where: { id } });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "训练任务不存在", 404);
    }

    await prisma.trainingTask.delete({ where: { id } });

    await writeAudit(prisma, session.user.id, "training_task.delete", "TrainingTask", id, { title: existing.title });

    return ok({ deleted: true });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("DELETE /api/admin/training/tasks/[id] error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
