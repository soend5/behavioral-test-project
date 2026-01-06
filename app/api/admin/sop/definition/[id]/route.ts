/**
 * PATCH /api/admin/sop/definition/:id - 更新 SOP Definition
 * DELETE /api/admin/sop/definition/:id - 删除 SOP Definition
 * 
 * 使用的门禁函数：
 * - requireAdmin() (要求 admin 角色)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ role 必须是 admin
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
    const sopId = params.id;
    const body = await request.json();
    const {
      sopName,
      sopStage,
      status,
      priority,
      stateSummary,
      coreGoal,
      strategyListJson,
      forbiddenListJson,
      notes,
    } = body;

    // 获取现有 SOP
    const sop = await prisma.sopDefinition.findUnique({
      where: { sopId },
    });

    if (!sop) {
      return fail(ErrorCode.NOT_FOUND, "SOP Definition 不存在");
    }

    // 验证 JSON 格式
    let strategyList = undefined;
    let forbiddenList = undefined;

    if (strategyListJson !== undefined) {
      if (strategyListJson === null) {
        strategyList = null;
      } else {
        try {
          strategyList = typeof strategyListJson === "string"
            ? JSON.parse(strategyListJson)
            : strategyListJson;
          if (!Array.isArray(strategyList)) {
            return fail(ErrorCode.VALIDATION_ERROR, "strategyListJson 必须是 JSON 数组");
          }
        } catch (e) {
          return fail(ErrorCode.VALIDATION_ERROR, "strategyListJson 格式错误");
        }
      }
    }

    if (forbiddenListJson !== undefined) {
      if (forbiddenListJson === null) {
        forbiddenList = null;
      } else {
        try {
          forbiddenList = typeof forbiddenListJson === "string"
            ? JSON.parse(forbiddenListJson)
            : forbiddenListJson;
          if (!Array.isArray(forbiddenList)) {
            return fail(ErrorCode.VALIDATION_ERROR, "forbiddenListJson 必须是 JSON 数组");
          }
        } catch (e) {
          return fail(ErrorCode.VALIDATION_ERROR, "forbiddenListJson 格式错误");
        }
      }
    }

    // 更新 SOP
    const updatedSop = await prisma.sopDefinition.update({
      where: { sopId },
      data: {
        sopName,
        sopStage,
        status,
        priority: priority !== undefined ? parseInt(priority) : undefined,
        stateSummary,
        coreGoal,
        strategyListJson: strategyList !== undefined
          ? (strategyList ? JSON.stringify(strategyList) : null)
          : undefined,
        forbiddenListJson: forbiddenList !== undefined
          ? (forbiddenList ? JSON.stringify(forbiddenList) : null)
          : undefined,
        notes,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_sop",
      "sop_definition",
      sopId,
      {
        previousName: sop.sopName,
        newName: sopName,
      }
    );

    return ok({
      sop: {
        sopId: updatedSop.sopId,
        sopName: updatedSop.sopName,
        sopStage: updatedSop.sopStage,
        status: updatedSop.status,
        priority: updatedSop.priority,
        updatedAt: updatedSop.updatedAt,
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
      return fail(error.message, "SOP Definition 不存在");
    }
    console.error("Update SOP definition error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const sopId = params.id;

    // 检查是否存在
    const sop = await prisma.sopDefinition.findUnique({
      where: { sopId },
    });

    if (!sop) {
      return fail(ErrorCode.NOT_FOUND, "SOP Definition 不存在");
    }

    // 删除 SOP（级联删除 rules 和 stage maps）
    await prisma.sopDefinition.delete({
      where: { sopId },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.delete_sop",
      "sop_definition",
      sopId,
      {
        sopName: sop.sopName,
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
      return fail(error.message, "SOP Definition 不存在");
    }
    console.error("Delete SOP definition error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

