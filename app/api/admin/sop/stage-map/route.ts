/**
 * GET /api/admin/sop/stage-map - 获取 SOP Stage Map 列表
 * POST /api/admin/sop/stage-map - 创建 SOP Stage Map
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

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const sopId = searchParams.get("sop_id") || "";
    const stageId = searchParams.get("stage_id") || "";

    const where: any = {};
    if (sopId) {
      where.sopId = sopId;
    }
    if (stageId) {
      where.stageId = stageId;
    }

    const maps = await prisma.sopStageMap.findMany({
      where,
      orderBy: [
        { sopId: "asc" },
        { stageId: "asc" },
      ],
      include: {
        sop: {
          select: {
            sopId: true,
            sopName: true,
            sopStage: true,
          },
        },
        stage: {
          select: {
            stageId: true,
            stageName: true,
          },
        },
      },
    });

    return ok({
      maps: maps.map((map) => ({
        id: map.id,
        sopId: map.sopId,
        sop: map.sop,
        stageId: map.stageId,
        stage: map.stage,
        isDefault: map.isDefault,
        remark: map.remark,
        createdAt: map.createdAt,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get SOP stage map error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { sopId, stageId, isDefault = false, remark } = body;

    if (!sopId || !stageId) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：sopId, stageId");
    }

    // 验证 SOP 存在
    const sop = await prisma.sopDefinition.findUnique({
      where: { sopId },
    });

    if (!sop) {
      return fail(ErrorCode.NOT_FOUND, "SOP Definition 不存在");
    }

    // 验证 Stage 存在
    const stage = await prisma.coachingStage.findUnique({
      where: { stageId },
    });

    if (!stage) {
      return fail(ErrorCode.NOT_FOUND, "Coaching Stage 不存在");
    }

    // 如果 isDefault=true，检查该 stage 是否已有默认 map
    if (isDefault) {
      const existingDefault = await prisma.sopStageMap.findFirst({
        where: {
          stageId,
          isDefault: true,
        },
      });

      if (existingDefault && existingDefault.sopId !== sopId) {
        // 可选：自动取消其他默认
        await prisma.sopStageMap.updateMany({
          where: {
            stageId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    // 创建 Stage Map
    const map = await prisma.sopStageMap.create({
      data: {
        sopId,
        stageId,
        isDefault: Boolean(isDefault),
        remark,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_stage_map",
      "sop_stage_map",
      map.id,
      {
        sopId,
        stageId,
        isDefault,
      }
    );

    return ok({
      map: {
        id: map.id,
        sopId: map.sopId,
        stageId: map.stageId,
        isDefault: map.isDefault,
        remark: map.remark,
        createdAt: map.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create SOP stage map error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

