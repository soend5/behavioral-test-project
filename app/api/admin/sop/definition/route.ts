/**
 * GET /api/admin/sop/definition - 获取 SOP Definition 列表
 * POST /api/admin/sop/definition - 创建 SOP Definition
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
import { safeJsonParseWithSchema } from "@/lib/json";
import { z } from "zod";

const StringArraySchema = z.array(z.string());

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const sops = await prisma.sopDefinition.findMany({
      orderBy: [
        { sopStage: "asc" },
        { priority: "desc" },
      ],
      include: {
        _count: {
          select: {
            rules: true,
          },
        },
      },
    });

    if (process.env.DEBUG_SOP_ADMIN === "1") {
      console.log(`[admin:sop:definition] count=${sops.length}`);
    }

    return ok({
      sops: sops.map((sop) => ({
        sopId: sop.sopId,
        sopName: sop.sopName,
        sopStage: sop.sopStage,
        status: sop.status,
        priority: sop.priority,
        stateSummary: sop.stateSummary,
        coreGoal: sop.coreGoal,
        strategyList: safeJsonParseWithSchema(
          sop.strategyListJson,
          StringArraySchema,
          []
        ),
        forbiddenList: safeJsonParseWithSchema(
          sop.forbiddenListJson,
          StringArraySchema,
          []
        ),
        notes: sop.notes,
        createdAt: sop.createdAt,
        updatedAt: sop.updatedAt,
        ruleCount: sop._count.rules,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get SOP definition error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const {
      sopId,
      sopName,
      sopStage,
      status = "active",
      priority = 0,
      stateSummary,
      coreGoal,
      strategyListJson,
      forbiddenListJson,
      notes,
    } = body;

    if (!sopId || !sopName || !sopStage) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：sopId, sopName, sopStage");
    }

    // 验证 strategyListJson 和 forbiddenListJson 格式
    let strategyList = null;
    let forbiddenList = null;

    if (strategyListJson) {
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

    if (forbiddenListJson) {
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

    // 创建 SOP Definition
    const sop = await prisma.sopDefinition.create({
      data: {
        sopId,
        sopName,
        sopStage,
        status,
        priority: parseInt(priority),
        stateSummary,
        coreGoal,
        strategyListJson: strategyList ? JSON.stringify(strategyList) : null,
        forbiddenListJson: forbiddenList ? JSON.stringify(forbiddenList) : null,
        notes,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_sop",
      "sop_definition",
      sopId,
      {
        sopName,
        sopStage,
        priority,
      }
    );

    return ok({
      sop: {
        sopId: sop.sopId,
        sopName: sop.sopName,
        sopStage: sop.sopStage,
        status: sop.status,
        priority: sop.priority,
        createdAt: sop.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create SOP definition error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

