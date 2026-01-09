import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { hashToken } from "@/lib/token";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "Invalid request body", 400);
    }

    const { token, taskId, response } = body as {
      token?: string;
      taskId?: string;
      response?: unknown;
    };

    if (!token) {
      return fail(ErrorCode.INVALID_INPUT, "Missing token", 400);
    }
    if (!taskId) {
      return fail(ErrorCode.INVALID_INPUT, "Missing taskId", 400);
    }

    const tokenHash = hashToken(token);
    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
      select: { customerId: true },
    });

    if (!invite) {
      return fail(ErrorCode.NOT_FOUND, "Invite not found", 404);
    }

    const customerId = invite.customerId;

    const task = await prisma.trainingTask.findUnique({
      where: { id: taskId },
      select: { id: true, planId: true, dayNo: true },
    });

    if (!task) {
      return fail(ErrorCode.NOT_FOUND, "Task not found", 404);
    }

    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: {
        planId_customerId: {
          planId: task.planId,
          customerId,
        },
      },
      include: {
        plan: { select: { durationDays: true } },
        completions: { select: { taskId: true } },
      },
    });

    if (!enrollment) {
      return fail(ErrorCode.NOT_FOUND, "Not enrolled", 404);
    }

    if (enrollment.status !== "active") {
      return fail(ErrorCode.CONFLICT, "Training ended", 409);
    }

    const alreadyCompleted = enrollment.completions.some(
      (c) => c.taskId === taskId
    );
    if (alreadyCompleted) {
      return ok({ alreadyCompleted: true, message: "Already completed" });
    }

    const startDate = new Date(enrollment.startedAt);
    const now = new Date();
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentDay = Math.min(
      daysSinceStart + 1,
      enrollment.plan.durationDays
    );

    if (task.dayNo > currentDay) {
      return fail(ErrorCode.FORBIDDEN, "Task not unlocked yet", 403);
    }

    const completion = await prisma.taskCompletion.create({
      data: {
        enrollmentId: enrollment.id,
        taskId,
        responseJson: response ? JSON.stringify(response) : null,
      },
    });

    const totalTasks = await prisma.trainingTask.count({
      where: { planId: task.planId },
    });
    const completedCount = enrollment.completions.length + 1;

    if (completedCount >= totalTasks) {
      await prisma.trainingEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });
    }

    return ok({
      completion: {
        id: completion.id,
        taskId: completion.taskId,
        completedAt: completion.completedAt.toISOString(),
      },
      progress: {
        completed: completedCount,
        total: totalTasks,
        percent: Math.round((completedCount / totalTasks) * 100),
        isAllCompleted: completedCount >= totalTasks,
      },
    });
  } catch (e: unknown) {
    console.error("POST /api/public/training/complete error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "Server error", 500);
  }
}
