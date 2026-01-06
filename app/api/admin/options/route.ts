/**
 * GET /api/admin/options - 获取选项列表
 * POST /api/admin/options - 创建选项
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

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get("question_id") || "";

    const where: any = {};
    if (questionId) {
      where.questionId = questionId;
    }

    const options = await prisma.option.findMany({
      where,
      orderBy: [
        { questionId: "asc" },
        { orderNo: "asc" },
      ],
      include: {
        question: {
          select: {
            id: true,
            stem: true,
            quiz: {
              select: {
                id: true,
                version: true,
                quizVersion: true,
              },
            },
          },
        },
      },
    });

    return ok({
      options: options.map((opt) => ({
        id: opt.id,
        questionId: opt.questionId,
        question: opt.question,
        orderNo: opt.orderNo,
        text: opt.text,
        scorePayloadJson: opt.scorePayloadJson
          ? JSON.parse(opt.scorePayloadJson)
          : null,
        createdAt: opt.createdAt,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get options error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { questionId, orderNo, text, scorePayloadJson } = body;

    if (!questionId || orderNo === undefined || !text) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：questionId, orderNo, text");
    }

    // 验证题目存在
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return fail(ErrorCode.NOT_FOUND, "题目不存在");
    }

    // 验证 scorePayloadJson 格式（如果提供）
    let scorePayload = null;
    if (scorePayloadJson) {
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

    // 创建选项
    const option = await prisma.option.create({
      data: {
        questionId,
        orderNo: parseInt(orderNo),
        text,
        scorePayloadJson: scorePayload ? JSON.stringify(scorePayload) : null,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_option",
      "option",
      option.id,
      {
        questionId,
        orderNo,
        text,
      }
    );

    return ok({
      option: {
        id: option.id,
        questionId: option.questionId,
        orderNo: option.orderNo,
        text: option.text,
        scorePayloadJson: scorePayload,
        createdAt: option.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create option error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

