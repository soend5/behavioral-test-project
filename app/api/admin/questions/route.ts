/**
 * GET /api/admin/questions - 获取题目列表
 * POST /api/admin/questions - 创建题目
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
    const quizId = searchParams.get("quiz_id") || "";

    const where: any = {};
    if (quizId) {
      where.quizId = quizId;
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: [
        { quizId: "asc" },
        { orderNo: "asc" },
      ],
      include: {
        quiz: {
          select: {
            id: true,
            version: true,
            quizVersion: true,
            title: true,
          },
        },
        _count: {
          select: {
            options: true,
          },
        },
      },
    });

    return ok({
      questions: questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        quiz: q.quiz,
        orderNo: q.orderNo,
        stem: q.stem,
        status: q.status,
        createdAt: q.createdAt,
        optionCount: q._count.options,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get questions error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { quizId, orderNo, stem, status = "active", stableId } = body;

    if (!quizId || orderNo === undefined || !stem) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：quizId, orderNo, stem");
    }

    const parsedOrderNo = parseInt(orderNo);
    if (!Number.isFinite(parsedOrderNo) || parsedOrderNo <= 0) {
      return fail(ErrorCode.VALIDATION_ERROR, "orderNo 必须是正整数");
    }

    // 验证 quiz 存在
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return fail(ErrorCode.NOT_FOUND, "题库不存在");
    }

    // v1 题库只读（防止破坏式修改已上线版本）
    if (quiz.quizVersion === "v1") {
      return fail(ErrorCode.VALIDATION_ERROR, "v1 题库默认只读，请创建新 quizVersion");
    }

    // 创建题目
    const resolvedStableId =
      typeof stableId === "string" && stableId.trim() ? stableId.trim() : `order_${parsedOrderNo}`;
    const question = await prisma.question.create({
      data: {
        quizId,
        stableId: resolvedStableId,
        orderNo: parsedOrderNo,
        stem,
        status,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_question",
      "question",
      question.id,
      {
        quizId,
        orderNo,
        stem,
      }
    );

    return ok({
      question: {
        id: question.id,
        quizId: question.quizId,
        stableId: question.stableId,
        orderNo: question.orderNo,
        stem: question.stem,
        status: question.status,
        createdAt: question.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create question error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

