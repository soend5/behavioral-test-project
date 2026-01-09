/**
 * POST /api/coach/customers/batch - 批量操作客户
 * 
 * 支持的操作：
 * - addTag: 批量添加标签
 * - addFollowUp: 批量创建跟进记录
 * 
 * 限制：最多50个客户
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { z } from "zod";

const MAX_BATCH_SIZE = 50;

const BatchSchema = z.object({
  customerIds: z.array(z.string()).min(1).max(MAX_BATCH_SIZE),
  action: z.enum(["addTag", "addFollowUp"]),
  payload: z.object({
    tagKey: z.string().optional(),
    followUpType: z.string().optional(),
    followUpContent: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireCoach();
    
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { customerIds, action, payload } = parsed.data;

    // 验证客户属于当前助教
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        coachId: session.user.id,
      },
      select: { id: true },
    });

    if (customers.length !== customerIds.length) {
      return fail(ErrorCode.FORBIDDEN, "部分客户不属于您", 403);
    }

    let result: { success: number; failed: number } = { success: 0, failed: 0 };

    if (action === "addTag") {
      if (!payload.tagKey) {
        return fail(ErrorCode.INVALID_INPUT, "缺少 tagKey", 400);
      }

      // 批量添加标签
      for (const customerId of customerIds) {
        try {
          await prisma.coachTag.upsert({
            where: {
              customerId_coachId_tagKey: {
                customerId,
                coachId: session.user.id,
                tagKey: payload.tagKey,
              },
            },
            create: {
              customerId,
              coachId: session.user.id,
              tagKey: payload.tagKey,
            },
            update: {},
          });
          result.success++;
        } catch {
          result.failed++;
        }
      }

      await writeAudit(
        prisma,
        session.user.id,
        "coach.batch_add_tag",
        "CoachTag",
        null,
        { customerCount: customerIds.length, tagKey: payload.tagKey }
      );
    }

    if (action === "addFollowUp") {
      if (!payload.followUpType || !payload.followUpContent) {
        return fail(ErrorCode.INVALID_INPUT, "缺少跟进类型或内容", 400);
      }

      // 批量创建跟进记录
      for (const customerId of customerIds) {
        try {
          await prisma.followUpLog.create({
            data: {
              customerId,
              coachId: session.user.id,
              type: payload.followUpType,
              content: payload.followUpContent,
            },
          });
          result.success++;
        } catch {
          result.failed++;
        }
      }

      await writeAudit(
        prisma,
        session.user.id,
        "coach.batch_add_followup",
        "FollowUpLog",
        null,
        { customerCount: customerIds.length, type: payload.followUpType }
      );
    }

    return ok({
      action,
      result,
      message: `成功处理 ${result.success} 个客户${result.failed > 0 ? `，${result.failed} 个失败` : ""}`,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足", 401);
    }
    console.error("Batch operation error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
