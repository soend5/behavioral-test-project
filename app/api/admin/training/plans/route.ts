/**
 * v1.8: 训练计划管理 API (Admin)
 * GET  - 获取训练计划列表
 * POST - 创建训练计划
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

const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable().optional(),
  durationDays: z.number().int().min(1).max(30),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    const plans = await prisma.trainingPlan.findMany({
      where: status ? { status } : undefined,
      include: {
        _count: {
          select: {
            tasks: true,
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        durationDays: p.durationDays,
        status: p.status,
        taskCount: p._count.tasks,
        enrollmentCount: p._count.enrollments,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("GET /api/admin/training/plans error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = CreatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { name, description, durationDays } = parsed.data;

    const plan = await prisma.trainingPlan.create({
      data: {
        name,
        description: description ?? null,
        durationDays,
      },
    });

    await writeAudit(prisma, session.user.id, "training_plan.create", "TrainingPlan", plan.id, { name });

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
    console.error("POST /api/admin/training/plans error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
