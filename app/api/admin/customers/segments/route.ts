/**
 * v1.7: 客户分层统计 API
 * GET - 获取客户分层统计
 * POST - 重新计算所有客户分层
 * 
 * 门禁：requireAdmin()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { calculateSegments, SEGMENT_DEFINITIONS, type CustomerForSegment } from "@/lib/customer-segment";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // 获取分层统计
    const segmentCounts = await prisma.customerSegment.groupBy({
      by: ["segment"],
      _count: true,
    });

    // 获取总客户数
    const totalCustomers = await prisma.customer.count();

    // 组装结果
    const segments = Object.entries(SEGMENT_DEFINITIONS).map(([key, def]) => {
      const found = segmentCounts.find((s) => s.segment === key);
      return {
        key,
        name: def.name,
        color: def.color,
        description: def.description,
        count: found?._count || 0,
      };
    });

    return ok({
      totalCustomers,
      segments,
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("GET /api/admin/customers/segments error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    // 获取所有客户及其相关数据
    const customers = await prisma.customer.findMany({
      include: {
        attempts: {
          where: { submittedAt: { not: null } },
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            version: true,
            submittedAt: true,
            stage: true,
            tagsJson: true,
            resultSummaryJson: true,
          },
        },
        followUpLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, createdAt: true },
        },
        coachTags: {
          select: { tagKey: true },
        },
      },
    });

    let updated = 0;
    let created = 0;

    // 批量处理
    for (const customer of customers) {
      const segments = calculateSegments(customer as CustomerForSegment);

      // 删除旧的分层
      await prisma.customerSegment.deleteMany({
        where: { customerId: customer.id },
      });

      // 创建新的分层
      if (segments.length > 0) {
        await prisma.customerSegment.createMany({
          data: segments.map((s) => ({
            customerId: customer.id,
            segment: s.segment,
            score: s.score,
            reason: s.reason,
          })),
        });
        created += segments.length;
      }
      updated++;
    }

    return ok({
      customersProcessed: updated,
      segmentsCreated: created,
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("POST /api/admin/customers/segments error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
