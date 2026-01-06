/**
 * GET /api/coach/me
 * 
 * 使用的门禁函数：
 * - requireCoach() (要求 coach 角色)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ role 必须是 coach 或 admin
 */
import { NextRequest } from "next/server";
import { requireCoach } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireCoach();

    return ok({
      user: {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

