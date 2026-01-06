/**
 * GET /api/public/attempt/result
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (允许 completed，因为这是查看结果)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 * ✅ Ownership：只返回该 invite 的 attempt 结果
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInviteByToken } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { safeJsonParse, safeJsonParseWithSchema } from "@/lib/json";
import { z } from "zod";

const StringArraySchema = z.array(z.string());

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return fail(ErrorCode.BAD_REQUEST, "缺少 token 参数");
    }

    // 使用门禁函数：token → invite 校验（允许 completed，因为这是查看结果）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered", "completed", "expired"],
      includeRelations: false,
    });

    // 查找已提交的 attempt
    const attempt = await prisma.attempt.findFirst({
      where: {
        inviteId: invite.id,
        submittedAt: { not: null },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    if (!attempt) {
      return fail(ErrorCode.NOT_FOUND, "测评结果不存在或未提交");
    }

    // 解析结果数据
    const tags = safeJsonParseWithSchema(attempt.tagsJson, StringArraySchema, []);
    const resultSummary = attempt.resultSummaryJson
      ? safeJsonParse(attempt.resultSummaryJson)
      : null;

    return ok({
      attempt: {
        id: attempt.id,
        version: attempt.version,
        submittedAt: attempt.submittedAt?.toISOString(),
        tags,
        stage: attempt.stage,
        resultSummary,
      },
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
    console.error("Get result error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
