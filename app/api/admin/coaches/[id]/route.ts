/**
 * PATCH /api/admin/coaches/:id - 更新助教账号（status/password）
 *
 * 使用的门禁函数：
 * - requireAdmin() (要求 admin 角色)
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

function isValidUserStatus(status: unknown): status is "active" | "inactive" {
  return status === "active" || status === "inactive";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const userId = params.id;

    const body = await request.json();
    const { password, status } = body as { password?: unknown; status?: unknown };

    if (password === undefined && status === undefined) {
      return fail(ErrorCode.VALIDATION_ERROR, "至少提供 password 或 status");
    }

    if (password !== undefined) {
      if (typeof password !== "string") {
        return fail(ErrorCode.VALIDATION_ERROR, "password 必须为 string");
      }
      if (password.length < 6) {
        return fail(ErrorCode.VALIDATION_ERROR, "password 至少 6 位");
      }
      if (password.length > 128) {
        return fail(ErrorCode.VALIDATION_ERROR, "password 过长");
      }
    }

    if (status !== undefined && !isValidUserStatus(status)) {
      return fail(ErrorCode.VALIDATION_ERROR, "status 必须是 active 或 inactive");
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true, username: true },
    });

    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "用户不存在");
    }

    if (existing.role !== "coach") {
      return fail(ErrorCode.FORBIDDEN, "禁止修改非 coach 账号");
    }

    const passwordHash =
      password !== undefined ? await bcrypt.hash(password, 10) : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    await writeAudit(prisma, session.user.id, "user.update", "user", userId, {
      status: status ?? existing.status,
      passwordChanged: password !== undefined,
    });

    return ok({ user: updated });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Update coach error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

