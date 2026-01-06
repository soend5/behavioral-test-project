/**
 * GET /api/admin/quiz - 获取题库列表
 * POST /api/admin/quiz - 创建题库
 * 
 * 使用的门禁函数：
 * - requireAdmin() (要求 admin 角色)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ role 必须是 admin
 * ✅ 版本保护：已被使用的 quiz_version 禁止破坏式修改
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

    const quizzes = await prisma.quiz.findMany({
      orderBy: [
        { quizVersion: "desc" },
        { version: "asc" },
      ],
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    return ok({
      quizzes: quizzes.map((q) => ({
        id: q.id,
        version: q.version,
        quizVersion: q.quizVersion,
        title: q.title,
        status: q.status,
        createdAt: q.createdAt,
        questionCount: q._count.questions,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get quiz error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { version, quizVersion, title, status = "active" } = body;

    if (!version || !quizVersion || !title) {
      return fail(ErrorCode.INVALID_INPUT, "缺少必要参数：version, quizVersion, title");
    }

    if (version !== "fast" && version !== "pro") {
      return fail(ErrorCode.VALIDATION_ERROR, "version 必须是 'fast' 或 'pro'");
    }

    // 创建题库
    const quiz = await prisma.quiz.create({
      data: {
        version,
        quizVersion,
        title,
        status,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "admin.create_quiz",
      "quiz",
      quiz.id,
      {
        version,
        quizVersion,
        title,
      }
    );

    return ok({
      quiz: {
        id: quiz.id,
        version: quiz.version,
        quizVersion: quiz.quizVersion,
        title: quiz.title,
        status: quiz.status,
        createdAt: quiz.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Create quiz error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

