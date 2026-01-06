/**
 * PATCH /api/admin/sop/rule/:id - 更新 SOP Rule
 * DELETE /api/admin/sop/rule/:id - 删除 SOP Rule
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
    const ruleId = params.id;
    const body = await request.json();
    const {
      requiredStage,
      requiredTagsJson,
      excludedTagsJson,
      confidence,
      status,
    } = body;

    // 获取现有 Rule
    const rule = await prisma.sopRule.findUnique({
      where: { ruleId },
    });

    if (!rule) {
      return fail(ErrorCode.NOT_FOUND, "SOP Rule 不存在");
    }

    // 验证 JSON 格式
    let requiredTags = undefined;
    let excludedTags = undefined;

    if (requiredTagsJson !== undefined) {
      if (requiredTagsJson === null) {
        requiredTags = null;
      } else {
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
    }

    if (excludedTagsJson !== undefined) {
      if (excludedTagsJson === null) {
        excludedTags = null;
      } else {
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
    }

    // 更新 Rule
    const updatedRule = await prisma.sopRule.update({
      where: { ruleId },
      data: {
        requiredStage,
        requiredTagsJson: requiredTags !== undefined
          ? (requiredTags ? JSON.stringify(requiredTags) : null)
          : undefined,
        excludedTagsJson: excludedTags !== undefined
          ? (excludedTags ? JSON.stringify(excludedTags) : null)
          : undefined,
        confidence: confidence !== undefined ? parseInt(confidence) : undefined,
        status,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_sop_rule",
      "sop_rule",
      ruleId,
      {
        sopId: rule.sopId,
      }
    );

    return ok({
      rule: {
        ruleId: updatedRule.ruleId,
        sopId: updatedRule.sopId,
        requiredStage: updatedRule.requiredStage,
        confidence: updatedRule.confidence,
        status: updatedRule.status,
        updatedAt: updatedRule.updatedAt,
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
      return fail(error.message, "SOP Rule 不存在");
    }
    console.error("Update SOP rule error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const ruleId = params.id;

    // 检查是否存在
    const rule = await prisma.sopRule.findUnique({
      where: { ruleId },
    });

    if (!rule) {
      return fail(ErrorCode.NOT_FOUND, "SOP Rule 不存在");
    }

    // 删除 Rule
    await prisma.sopRule.delete({
      where: { ruleId },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.delete_sop_rule",
      "sop_rule",
      ruleId,
      {
        sopId: rule.sopId,
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
      return fail(error.message, "SOP Rule 不存在");
    }
    console.error("Delete SOP rule error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

