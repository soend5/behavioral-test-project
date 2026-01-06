/**
 * GET /api/admin/sop/stage - 获取 Coaching Stage 列表
 * POST /api/admin/sop/stage - 创建 Coaching Stage
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
import { safeJsonParseWithSchema } from "@/lib/json";
import { z } from "zod";

const StringArraySchema = z.array(z.string());

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const stages = await prisma.coachingStage.findMany({
      orderBy: { stageId: "asc" },
    });

    return ok({
      stages: stages.map((stage) => ({
        stageId: stage.stageId,
        stageName: stage.stageName,
        stageDesc: stage.stageDesc,
        uiColor: stage.uiColor,
        allowActions: safeJsonParseWithSchema(
          stage.allowActions,
          StringArraySchema,
          []
        ),
        forbidActions: safeJsonParseWithSchema(
          stage.forbidActions,
          StringArraySchema,
          []
        ),
        createdAt: stage.createdAt,
        updatedAt: stage.updatedAt,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get coaching stage error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const {
      stageId,
      stageName,
      stageDesc,
      uiColor,
      allowActions,
      forbidActions,
    } = body;

    if (!stageId || !stageName) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：stageId, stageName");
    }

    // 验证 JSON 格式
    let allowActionsList = null;
    let forbidActionsList = null;

    if (allowActions) {
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

    if (forbidActions) {
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

    // 创建 Coaching Stage
    const stage = await prisma.coachingStage.create({
      data: {
        stageId,
        stageName,
        stageDesc,
        uiColor,
        allowActions: allowActionsList ? JSON.stringify(allowActionsList) : null,
        forbidActions: forbidActionsList ? JSON.stringify(forbidActionsList) : null,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_stage",
      "coaching_stage",
      stageId,
      {
        stageName,
      }
    );

    return ok({
      stage: {
        stageId: stage.stageId,
        stageName: stage.stageName,
        stageDesc: stage.stageDesc,
        uiColor: stage.uiColor,
        createdAt: stage.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create coaching stage error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

