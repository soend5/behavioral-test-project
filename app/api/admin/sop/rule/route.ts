/**
 * GET /api/admin/sop/rule - 获取 SOP Rule 列表
 * POST /api/admin/sop/rule - 创建 SOP Rule
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
    const searchParams = request.nextUrl.searchParams;
    const sopId = searchParams.get("sop_id") || "";

    const where: any = {};
    if (sopId) {
      where.sopId = sopId;
    }

    const rules = await prisma.sopRule.findMany({
      where,
      orderBy: [
        { sopId: "asc" },
        { confidence: "desc" },
      ],
      include: {
        sop: {
          select: {
            sopId: true,
            sopName: true,
            sopStage: true,
          },
        },
      },
    });

    return ok({
      rules: rules.map((rule) => ({
        ruleId: rule.ruleId,
        sopId: rule.sopId,
        sop: rule.sop,
        requiredStage: rule.requiredStage,
        requiredTags: rule.requiredTagsJson
          ? safeJsonParseWithSchema(rule.requiredTagsJson, StringArraySchema, [])
          : [],
        excludedTags: rule.excludedTagsJson
          ? safeJsonParseWithSchema(rule.excludedTagsJson, StringArraySchema, [])
          : [],
        confidence: rule.confidence,
        status: rule.status,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get SOP rule error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const {
      ruleId,
      sopId,
      requiredStage,
      requiredTagsJson,
      excludedTagsJson,
      confidence = 0,
      status = "active",
    } = body;

    if (!ruleId || !sopId) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：ruleId, sopId");
    }

    // 验证 SOP 存在
    const sop = await prisma.sopDefinition.findUnique({
      where: { sopId },
    });

    if (!sop) {
      return fail(ErrorCode.NOT_FOUND, "SOP Definition 不存在");
    }

    // 验证 JSON 格式
    let requiredTags = null;
    let excludedTags = null;

    if (requiredTagsJson) {
      try {
        requiredTags = typeof requiredTagsJson === "string"
          ? JSON.parse(requiredTagsJson)
          : requiredTagsJson;
        if (!Array.isArray(requiredTags)) {
          return fail(ErrorCode.VALIDATION_ERROR, "requiredTagsJson 必须是 JSON 数组");
        }
      } catch (e) {
        return fail(ErrorCode.VALIDATION_ERROR, "requiredTagsJson 格式错误");
      }
    }

    if (excludedTagsJson) {
      try {
        excludedTags = typeof excludedTagsJson === "string"
          ? JSON.parse(excludedTagsJson)
          : excludedTagsJson;
        if (!Array.isArray(excludedTags)) {
          return fail(ErrorCode.VALIDATION_ERROR, "excludedTagsJson 必须是 JSON 数组");
        }
      } catch (e) {
        return fail(ErrorCode.VALIDATION_ERROR, "excludedTagsJson 格式错误");
      }
    }

    // 创建 SOP Rule
    const rule = await prisma.sopRule.create({
      data: {
        ruleId,
        sopId,
        requiredStage,
        requiredTagsJson: requiredTags ? JSON.stringify(requiredTags) : null,
        excludedTagsJson: excludedTags ? JSON.stringify(excludedTags) : null,
        confidence: parseInt(confidence),
        status,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_sop_rule",
      "sop_rule",
      ruleId,
      {
        sopId,
        requiredStage,
        confidence,
      }
    );

    return ok({
      rule: {
        ruleId: rule.ruleId,
        sopId: rule.sopId,
        requiredStage: rule.requiredStage,
        requiredTags: requiredTags,
        excludedTags: excludedTags,
        confidence: rule.confidence,
        status: rule.status,
        createdAt: rule.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create SOP rule error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

