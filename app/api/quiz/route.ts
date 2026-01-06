/**
 * GET /api/quiz
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (拒绝 completed/expired)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 * ✅ 状态校验：拒绝 completed/expired 状态
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInviteByToken } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return fail(ErrorCode.BAD_REQUEST, "缺少 token 参数");
    }

    // 使用门禁函数：token → invite 校验（拒绝 completed/expired）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered"],
      includeRelations: false,
    });

    // 获取题目列表（依赖 quizVersion + version 的唯一约束）
    const quiz = await prisma.quiz.findUnique({
      where: {
        quizVersion_version: {
          quizVersion: invite.quizVersion,
          version: invite.version,
        },
      },
      include: {
        questions: {
          where: { status: "active" },
          orderBy: { orderNo: "asc" },
          include: {
            options: {
              orderBy: { orderNo: "asc" },
            },
          },
        },
      },
    });

    if (!quiz || quiz.status !== "active") {
      return fail(ErrorCode.NOT_FOUND, "未找到对应的题库");
    }

    return ok({
      questions: quiz.questions.map((q) => ({
        id: q.id,
        orderNo: q.orderNo,
        stem: q.stem,
        options: q.options.map((opt) => ({
          id: opt.id,
          orderNo: opt.orderNo,
          text: opt.text,
        })),
      })),
      version: quiz.version,
      quizVersion: quiz.quizVersion,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.INVITE_INVALID ||
      error.message === ErrorCode.INVITE_EXPIRED_OR_COMPLETED ||
      error.message === ErrorCode.BAD_REQUEST
    ) {
      const messageMap: Record<string, string> = {
        [ErrorCode.INVITE_INVALID]: "邀请 token 无效或不存在",
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成",
        [ErrorCode.BAD_REQUEST]: "缺少 token 参数",
      };
      return fail(error.message, messageMap[error.message] || error.message);
    }
    console.error("Get quiz error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
