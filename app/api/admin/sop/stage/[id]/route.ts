/**
 * PATCH /api/admin/sop/stage/:id - 更新 Coaching Stage
 * DELETE /api/admin/sop/stage/:id - 删除 Coaching Stage
 * 
 * 使用的门禁函数：
 * - requireAdmin() (要求 admin 角色)
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const stageId = params.id;
    const body = await request.json();
    const { stageName, stageDesc, uiColor, allowActions, forbidActions } = body;

    // 获取现有 Stage
    const stage = await prisma.coachingStage.findUnique({
      where: { stageId },
    });

    if (!stage) {
      return fail(ErrorCode.NOT_FOUND, "Coaching Stage 不存在");
    }

    // 验证 JSON 格式
    let allowActionsList = undefined;
    let forbidActionsList = undefined;

    if (allowActions !== undefined) {
      if (allowActions === null) {
        allowActionsList = null;
      } else {
        try {
          allowActionsList = typeof allowActions === "string"
            ? JSON.parse(allowActions)
            : allowActions;
          if (!Array.isArray(allowActionsList)) {
            return fail(ErrorCode.VALIDATION_ERROR, "allowActions 必须是 JSON 数组");
          }
        } catch (e) {
          return fail(ErrorCode.VALIDATION_ERROR, "allowActions 格式错误");
        }
      }
    }

    if (forbidActions !== undefined) {
      if (forbidActions === null) {
        forbidActionsList = null;
      } else {
        try {
          forbidActionsList = typeof forbidActions === "string"
            ? JSON.parse(forbidActions)
            : forbidActions;
          if (!Array.isArray(forbidActionsList)) {
            return fail(ErrorCode.VALIDATION_ERROR, "forbidActions 必须是 JSON 数组");
          }
        } catch (e) {
          return fail(ErrorCode.VALIDATION_ERROR, "forbidActions 格式错误");
        }
      }
    }

    // 更新 Stage
    const updatedStage = await prisma.coachingStage.update({
      where: { stageId },
      data: {
        stageName,
        stageDesc,
        uiColor,
        allowActions: allowActionsList !== undefined
          ? (allowActionsList ? JSON.stringify(allowActionsList) : null)
          : undefined,
        forbidActions: forbidActionsList !== undefined
          ? (forbidActionsList ? JSON.stringify(forbidActionsList) : null)
          : undefined,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_stage",
      "coaching_stage",
      stageId,
      {
        previousName: stage.stageName,
        newName: stageName,
      }
    );

    return ok({
      stage: {
        stageId: updatedStage.stageId,
        stageName: updatedStage.stageName,
        stageDesc: updatedStage.stageDesc,
        uiColor: updatedStage.uiColor,
        updatedAt: updatedStage.updatedAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "Coaching Stage 不存在");
    }
    console.error("Update coaching stage error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const stageId = params.id;

    // 检查是否存在
    const stage = await prisma.coachingStage.findUnique({
      where: { stageId },
    });

    if (!stage) {
      return fail(ErrorCode.NOT_FOUND, "Coaching Stage 不存在");
    }

    // 删除 Stage（级联删除 stage maps）
    await prisma.coachingStage.delete({
      where: { stageId },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.delete_stage",
      "coaching_stage",
      stageId,
      {
        stageName: stage.stageName,
      }
    );

    return ok({
      deleted: true,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "Coaching Stage 不存在");
    }
    console.error("Delete coaching stage error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

