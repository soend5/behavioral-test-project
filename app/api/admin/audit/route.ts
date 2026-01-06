/**
 * GET /api/admin/audit - 获取审计日志
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
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const actorUserId = searchParams.get("actor_user_id") || "";
    const action = searchParams.get("action") || "";
    const targetType = searchParams.get("target_type") || "";
    const startDate = searchParams.get("start_date") || "";
    const endDate = searchParams.get("end_date") || "";

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};

    if (actorUserId) {
      where.actorUserId = actorUserId;
    }

    if (action) {
      where.action = { contains: action };
    }

    if (targetType) {
      where.targetType = targetType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ok({
      logs: logs.map((log) => ({
        id: log.id,
        actorUser: log.actorUser,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        metaJson: log.metaJson ? JSON.parse(log.metaJson) : null,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get audit log error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

