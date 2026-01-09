/**
 * v1.8: 训练计划单项操作 API (Admin)
 * GET    - 获取计划详情（含任务）
 * PATCH  - 更新计划
 * DELETE - 删除计划
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

const UpdatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  durationDays: z.number().int().min(1).max(30).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;

    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: [{ dayNo: "asc" }, { orderNo: "asc" }],
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!plan) {
      return fail(ErrorCode.NOT_FOUND, "训练计划不存在", 404);
    }

    return ok({
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        durationDays: plan.durationDays,
        status: plan.status,
        enrollmentCount: plan._count.enrollments,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
        tasks: plan.tasks.map((t) => ({
          id: t.id,
          dayNo: t.dayNo,
          orderNo: t.orderNo,
          type: t.type,
          title: t.title,
          description: t.description,
          content: t.contentJson ? JSON.parse(t.contentJson) : null,
          estimatedMinutes: t.estimatedMinutes,
        })),
      },
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("GET /api/admin/training/plans/[id] error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;

    const existing = await prisma.trainingPlan.findUnique({ where: { id } });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "训练计划不存在", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = UpdatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const plan = await prisma.trainingPlan.update({
      where: { id },
      data: parsed.data,
    });

    await writeAudit(prisma, session.user.id, "training_plan.update", "TrainingPlan", id, parsed.data);

    return ok({
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        durationDays: plan.durationDays,
        status: plan.status,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("PATCH /api/admin/training/plans/[id] error:", e);
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

    const existing = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });

    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "训练计划不存在", 404);
    }

    if (existing._count.enrollments > 0) {
      // 有学员报名，只能软删除
      await prisma.trainingPlan.update({
        where: { id },
        data: { status: "inactive" },
      });
    } else {
      // 无学员，可以硬删除
      await prisma.trainingPlan.delete({ where: { id } });
    }

    await writeAudit(prisma, session.user.id, "training_plan.delete", "TrainingPlan", id, { name: existing.name });

    return ok({ deleted: true });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("DELETE /api/admin/training/plans/[id] error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
