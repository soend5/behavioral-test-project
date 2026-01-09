/**
 * v1.6: 话术获取 API (Coach)
 * GET - 获取匹配客户的话术列表
 * 
 * 门禁：requireCoach()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireCoach();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const category = searchParams.get("category");

    // Get all active scripts
    const scripts = await prisma.scriptTemplate.findMany({
      where: {
        status: "active",
        ...(category && { category }),
      },
      orderBy: [{ category: "asc" }, { usageCount: "desc" }, { name: "asc" }],
    });

    // If customerId provided, get customer data for matching
    let customerData: {
      stage: string | null;
      archetype: string | null;
      tags: string[];
    } | null = null;

    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          attempts: {
            where: { submittedAt: { not: null } },
            orderBy: { submittedAt: "desc" },
            take: 1,
          },
          coachTags: true,
        },
      });

      if (customer) {
        const latestAttempt = customer.attempts[0];
        const resultSummary = latestAttempt?.resultSummaryJson
          ? JSON.parse(latestAttempt.resultSummaryJson)
          : null;
        const systemTags = latestAttempt?.tagsJson
          ? JSON.parse(latestAttempt.tagsJson)
          : [];
        const coachTagKeys = customer.coachTags.map((t) => t.tagKey);

        customerData = {
          stage: latestAttempt?.stage ?? null,
          archetype: resultSummary?.archetype ?? null,
          tags: [...systemTags, ...coachTagKeys],
        };
      }
    }

    // Score and sort scripts by relevance
    const scoredScripts = scripts.map((s) => {
      let score = 0;

      if (customerData) {
        // Stage match
        if (s.triggerStage && s.triggerStage === customerData.stage) {
          score += 10;
        }

        // Archetype match
        if (s.triggerArchetype && s.triggerArchetype === customerData.archetype) {
          score += 10;
        }

        // Tag match
        if (s.triggerTagsJson) {
          const triggerTags = JSON.parse(s.triggerTagsJson) as string[];
          const matchedTags = triggerTags.filter((t) => customerData!.tags.includes(t));
          score += matchedTags.length * 5;
        }
      }

      return {
        id: s.id,
        name: s.name,
        category: s.category,
        triggerStage: s.triggerStage,
        triggerArchetype: s.triggerArchetype,
        triggerTags: s.triggerTagsJson ? JSON.parse(s.triggerTagsJson) : [],
        content: s.content,
        variables: s.variablesJson ? JSON.parse(s.variablesJson) : [],
        usageCount: s.usageCount,
        relevanceScore: score,
      };
    });

    // Sort by relevance score (desc), then by usage count (desc)
    scoredScripts.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.usageCount - a.usageCount;
    });

    return ok({
      scripts: scoredScripts,
      customerContext: customerData,
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("GET /api/coach/scripts error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
