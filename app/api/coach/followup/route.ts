/**
 * v1.6: 跟进记录 API (Coach)
 * GET  - 获取客户跟进记录
 * POST - 创建跟进记录
 * 
 * 门禁：requireCoach() + requireCoachOwnsCustomer()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach, requireCoachOwnsCustomer } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { z } from "zod";

const CreateFollowUpSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(["wechat", "call", "note"]),
  content: z.string().min(1).max(2000),
  nextAction: z.string().max(200).nullable().optional(),
  nextDate: z.string().nullable().optional(), // ISO date string
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireCoach();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 customerId 参数", 400);
    }

    // Verify customer exists and belongs to coach
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    const logs = await prisma.followUpLog.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({
      logs: logs.map((l) => ({
        id: l.id,
        customerId: l.customerId,
        coachId: l.coachId,
        type: l.type,
        content: l.content,
        nextAction: l.nextAction,
        nextDate: l.nextDate?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    if (e?.code === ErrorCode.FORBIDDEN) {
      return fail(ErrorCode.FORBIDDEN, e.message, 403);
    }
    console.error("GET /api/coach/followup error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireCoach();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = CreateFollowUpSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { customerId, type, content, nextAction, nextDate } = parsed.data;

    // Verify customer exists and belongs to coach
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    const log = await prisma.followUpLog.create({
      data: {
        customerId,
        coachId: session.user.id,
        type,
        content,
        nextAction: nextAction ?? null,
        nextDate: nextDate ? new Date(nextDate) : null,
      },
    });

    return ok({
      log: {
        id: log.id,
        customerId: log.customerId,
        coachId: log.coachId,
        type: log.type,
        content: log.content,
        nextAction: log.nextAction,
        nextDate: log.nextDate?.toISOString() ?? null,
        createdAt: log.createdAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    if (e?.code === ErrorCode.FORBIDDEN) {
      return fail(ErrorCode.FORBIDDEN, e.message, 403);
    }
    console.error("POST /api/coach/followup error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
