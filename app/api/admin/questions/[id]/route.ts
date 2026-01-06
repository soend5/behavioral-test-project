/**
 * PATCH /api/admin/questions/:id - 更新题目
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
    const questionId = params.id;
    const body = await request.json();
    const { orderNo, stem, status } = body;

    // 获取现有题目
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return fail(ErrorCode.NOT_FOUND, "题目不存在");
    }

    // 更新题目
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        orderNo: orderNo !== undefined ? parseInt(orderNo) : undefined,
        stem,
        status,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_question",
      "question",
      questionId,
      {
        previousOrderNo: question.orderNo,
        previousStem: question.stem,
        previousStatus: question.status,
        newOrderNo: orderNo,
        newStem: stem,
        newStatus: status,
      }
    );

    return ok({
      question: {
        id: updatedQuestion.id,
        quizId: updatedQuestion.quizId,
        orderNo: updatedQuestion.orderNo,
        stem: updatedQuestion.stem,
        status: updatedQuestion.status,
        updatedAt: updatedQuestion.createdAt,
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
      return fail(error.message, "题目不存在");
    }
    console.error("Update question error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

