/**
 * GET /api/coach/customers/:id/stage - 获取客户的 coach_stage
 * POST /api/coach/customers/:id/stage - 设置/推进 coach_stage
 *
 * 使用的门禁函数：
 * - requireCoach() (要求 coach 角色)
 * - requireCoachOwnsCustomer() (验证 ownership)
 *
 * 说明：
 * - coach_stage 为 V1.2 陪跑阶段（pre/mid/post），存储在 Customer.note 的 metadata 中
 * - Customer.note 同时承载“备注”纯文本；写入 stage 时必须保留原备注（见 lib/coach-stage.ts）
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachOwnsCustomer } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { advanceStage, getCoachStage, setCoachStage, type CoachStage } from "@/lib/coach-stage";

function isCoachStage(value: unknown): value is CoachStage {
  return value === "pre" || value === "mid" || value === "post";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { note: true },
    });

    if (!customer) {
      return fail(ErrorCode.CUSTOMER_NOT_FOUND, "客户不存在");
    }

    const stage = getCoachStage(customer.note);

    return ok({ stage });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND) {
      return fail(error.message, "客户不存在");
    }
    console.error("Get coach stage error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    const body = await request.json();
    const requestedStage = (body?.stage ?? null) as unknown;
    const action = (body?.action ?? null) as unknown;

    let nextStage: CoachStage | null = null;
    let mode: "set" | "advance" | null = null;

    if (isCoachStage(requestedStage)) {
      nextStage = requestedStage;
      mode = "set";
    } else if (action === "advance") {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { note: true },
      });
      if (!customer) {
        return fail(ErrorCode.CUSTOMER_NOT_FOUND, "客户不存在");
      }
      const current = getCoachStage(customer.note);
      nextStage = advanceStage(current);
      mode = "advance";
    } else {
      return fail(
        ErrorCode.VALIDATION_ERROR,
        "参数错误：请提供 stage(pre/mid/post) 或 action=advance"
      );
    }

    await setCoachStage(prisma, customerId, nextStage);

    await writeAudit(prisma, session.user.id, "coach.set_stage", "customer", customerId, {
      stage: nextStage,
      mode,
    });

    return ok({ stage: nextStage });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND || error.message === "CUSTOMER_NOT_FOUND") {
      return fail(ErrorCode.CUSTOMER_NOT_FOUND, "客户不存在");
    }
    console.error("Set coach stage error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

