/**
 * PATCH /api/admin/options/:id - 更新选项
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
import { safeJsonParse } from "@/lib/json";
import { z } from "zod";

const DeleteSchema = z.object({
  confirmText: z.literal("确认删除"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const optionId = params.id;
    const body = await request.json();
    const { orderNo, text, scorePayloadJson } = body;

    // 获取现有选项
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { question: { select: { quiz: { select: { quizVersion: true } } } } },
    });

    if (!option) {
      return fail(ErrorCode.NOT_FOUND, "选项不存在");
    }

    // 验证 scorePayloadJson 格式（如果提供）
    let scorePayload = null;
    if (scorePayloadJson !== undefined) {
      if (scorePayloadJson === null) {
        scorePayload = null;
      } else {
        try {
          scorePayload = typeof scorePayloadJson === "string"
            ? JSON.parse(scorePayloadJson)
            : scorePayloadJson;
          // 验证是对象
          if (typeof scorePayload !== "object" || Array.isArray(scorePayload)) {
            return fail(ErrorCode.VALIDATION_ERROR, "scorePayloadJson 必须是 JSON 对象");
          }
        } catch (e) {
          return fail(ErrorCode.VALIDATION_ERROR, "scorePayloadJson 格式错误");
        }
      }
    }

    // 更新选项
    const updatedOption = await prisma.option.update({
      where: { id: optionId },
      data: {
        orderNo:
          orderNo !== undefined
            ? Number.isFinite(parseInt(orderNo))
              ? parseInt(orderNo)
              : undefined
            : undefined,
        text,
        scorePayloadJson: scorePayloadJson !== undefined
          ? (scorePayload ? JSON.stringify(scorePayload) : null)
          : undefined,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_option",
      "option",
      optionId,
      {
        previousOrderNo: option.orderNo,
        previousText: option.text,
        newOrderNo: orderNo,
        newText: text,
      }
    );

    return ok({
      option: {
        id: updatedOption.id,
        questionId: updatedOption.questionId,
        orderNo: updatedOption.orderNo,
        text: updatedOption.text,
        scorePayloadJson: updatedOption.scorePayloadJson
          ? safeJsonParse(updatedOption.scorePayloadJson)
          : null,
        updatedAt: updatedOption.createdAt,
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
      return fail(error.message, "选项不存在");
    }
    console.error("Update option error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.BAD_REQUEST, "请求体必须为 JSON");
    }

    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.VALIDATION_ERROR, "请手动输入“确认删除”以继续");
    }

    const existing = await prisma.option.findUnique({
      where: { id: params.id },
      include: { question: { select: { quiz: { select: { quizVersion: true } } } } },
    });

    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "选项不存在");
    }

    const deleted = await prisma.option.delete({ where: { id: params.id } });

    await writeAudit(prisma, session.user.id, "admin.delete_option", "option", deleted.id, {
      questionId: deleted.questionId,
      stableId: deleted.stableId,
      orderNo: deleted.orderNo,
    });

    return ok({ deleted: true, id: deleted.id });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.NOT_FOUND) {
      return fail(error.message, "选项不存在");
    }
    console.error("Delete option error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

