/**
 * v1.6: 话术使用记录 API (Coach)
 * POST - 记录话术使用
 * 
 * 门禁：requireCoach() + requireCoachOwnsCustomer()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach, requireCoachOwnsCustomer } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { z } from "zod";

const UseScriptSchema = z.object({
  customerId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireCoach();
    const { id: scriptId } = params;

    // Verify script exists
    const script = await prisma.scriptTemplate.findUnique({ where: { id: scriptId } });
    if (!script) {
      return fail(ErrorCode.NOT_FOUND, "话术不存在", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = UseScriptSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { customerId } = parsed.data;

    // Verify customer exists and belongs to coach
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    // Create usage log and increment usage count
    await prisma.$transaction([
      prisma.scriptUsageLog.create({
        data: {
          scriptId,
          coachId: session.user.id,
          customerId,
        },
      }),
      prisma.scriptTemplate.update({
        where: { id: scriptId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);

    return ok({ recorded: true });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    if (e?.code === ErrorCode.FORBIDDEN) {
      return fail(ErrorCode.FORBIDDEN, e.message, 403);
    }
    console.error("POST /api/coach/scripts/[id]/use error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
