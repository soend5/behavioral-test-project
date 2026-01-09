/**
 * GET /api/admin/coaches - 获取助教列表
 * POST /api/admin/coaches - 创建助教账号
 *
 * 使用的门禁函数：
 * - requireAdmin() (要求 admin 角色)
 */
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

function isValidUserStatus(status: unknown): status is "active" | "inactive" {
  return status === "active" || status === "inactive";
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");

    const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 200);

    const coaches = await prisma.user.findMany({
      where: { role: "coach" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        username: true,
        name: true,
        wechatQrcode: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { customers: true } },
      },
    });

    return ok({
      coaches: coaches.map((coach) => ({
        id: coach.id,
        username: coach.username,
        name: coach.name,
        wechatQrcode: coach.wechatQrcode,
        role: coach.role,
        status: coach.status,
        createdAt: coach.createdAt,
        updatedAt: coach.updatedAt,
        customerCount: coach._count.customers,
      })),
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get coaches error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { username, password, status = "active" } = body as {
      username?: unknown;
      password?: unknown;
      status?: unknown;
    };

    if (typeof username !== "string" || typeof password !== "string") {
      return fail(ErrorCode.VALIDATION_ERROR, "username/password 必须为 string");
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      return fail(ErrorCode.VALIDATION_ERROR, "username 不能为空");
    }
    if (trimmedUsername.length > 64) {
      return fail(ErrorCode.VALIDATION_ERROR, "username 过长");
    }
    if (password.length < 6) {
      return fail(ErrorCode.VALIDATION_ERROR, "password 至少 6 位");
    }
    if (password.length > 128) {
      return fail(ErrorCode.VALIDATION_ERROR, "password 过长");
    }
    if (!isValidUserStatus(status)) {
      return fail(ErrorCode.VALIDATION_ERROR, "status 必须是 active 或 inactive");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        passwordHash,
        role: "coach",
        status,
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await writeAudit(prisma, session.user.id, "user.create", "user", user.id, {
      username: user.username,
      role: user.role,
      status: user.status,
    });

    return ok({ user }, 201);
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return fail(ErrorCode.CONFLICT, "用户名已存在");
      }
    }
    console.error("Create coach error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

