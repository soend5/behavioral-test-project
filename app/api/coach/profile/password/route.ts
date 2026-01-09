/**
 * POST /api/coach/profile/password - 助教修改自己的密码
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCoach();
    const userId = session.user.id;

    const body = await request.json();
    const { oldPassword, newPassword } = body as {
      oldPassword?: string;
      newPassword?: string;
    };

    if (!oldPassword || !newPassword) {
      return fail(ErrorCode.VALIDATION_ERROR, "请提供当前密码和新密码");
    }

    if (newPassword.length < 6) {
      return fail(ErrorCode.VALIDATION_ERROR, "新密码至少6位");
    }

    if (newPassword.length > 128) {
      return fail(ErrorCode.VALIDATION_ERROR, "密码过长");
    }

    // 获取当前用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return fail(ErrorCode.NOT_FOUND, "用户不存在");
    }

    // 验证当前密码
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      return fail(ErrorCode.VALIDATION_ERROR, "当前密码错误");
    }

    // 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return ok({ success: true });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, "未登录", 401);
    }
    console.error("POST /api/coach/profile/password error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
