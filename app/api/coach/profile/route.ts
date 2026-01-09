/**
 * GET /api/coach/profile - 获取当前助教的个人信息
 */
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireCoach();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        wechatQrcode: true,
        status: true,
        createdAt: true,
        _count: { select: { customers: true } },
      },
    });

    if (!user) {
      return fail(ErrorCode.NOT_FOUND, "用户不存在");
    }

    return ok({
      profile: {
        id: user.id,
        username: user.username,
        name: user.name,
        wechatQrcode: user.wechatQrcode,
        status: user.status,
        createdAt: user.createdAt,
        customerCount: user._count.customers,
      },
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, "未登录", 401);
    }
    console.error("GET /api/coach/profile error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
