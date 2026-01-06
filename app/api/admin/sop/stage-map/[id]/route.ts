/**
 * PATCH /api/admin/sop/stage-map/:id - 更新 SOP Stage Map
 * DELETE /api/admin/sop/stage-map/:id - 删除 SOP Stage Map
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
    const mapId = params.id;
    const body = await request.json();
    const { isDefault, remark } = body;

    // 获取现有 Map
    const map = await prisma.sopStageMap.findUnique({
      where: { id: mapId },
    });

    if (!map) {
      return fail(ErrorCode.NOT_FOUND, "SOP Stage Map 不存在");
    }

    // 如果设置 isDefault=true，取消该 stage 的其他默认
    if (isDefault === true) {
      await prisma.sopStageMap.updateMany({
        where: {
          stageId: map.stageId,
          isDefault: true,
          id: { not: mapId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 更新 Map
    const updatedMap = await prisma.sopStageMap.update({
      where: { id: mapId },
      data: {
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
        remark,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_stage_map",
      "sop_stage_map",
      mapId,
      {
        sopId: map.sopId,
        stageId: map.stageId,
      }
    );

    return ok({
      map: {
        id: updatedMap.id,
        sopId: updatedMap.sopId,
        stageId: updatedMap.stageId,
        isDefault: updatedMap.isDefault,
        remark: updatedMap.remark,
        updatedAt: updatedMap.createdAt,
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
      return fail(error.message, "SOP Stage Map 不存在");
    }
    console.error("Update SOP stage map error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const mapId = params.id;

    // 检查是否存在
    const map = await prisma.sopStageMap.findUnique({
      where: { id: mapId },
    });

    if (!map) {
      return fail(ErrorCode.NOT_FOUND, "SOP Stage Map 不存在");
    }

    // 删除 Map
    await prisma.sopStageMap.delete({
      where: { id: mapId },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.delete_stage_map",
      "sop_stage_map",
      mapId,
      {
        sopId: map.sopId,
        stageId: map.stageId,
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
      return fail(error.message, "SOP Stage Map 不存在");
    }
    console.error("Delete SOP stage map error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

