import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function fail(code: string, message: string): ApiFail {
  return { ok: false, error: { code, message } };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(fail("UNAUTHORIZED", "需要管理员权限"), { status: 401 });
  }

  const sopId = req.nextUrl.searchParams.get("sopId");
  if (!sopId) {
    return NextResponse.json(fail("MISSING_SOP_ID", "缺少 sopId 参数"), { status: 400 });
  }

  try {
    // 获取 SOP 及其规则
    const sop = await prisma.sopDefinition.findUnique({
      where: { sopId },
      include: { rules: { where: { status: "active" } } },
    });

    if (!sop) {
      return NextResponse.json(fail("SOP_NOT_FOUND", "SOP 不存在"), { status: 404 });
    }

    // 获取所有有测评结果的客户
    const attempts = await prisma.attempt.findMany({
      where: { submittedAt: { not: null } },
      select: {
        customerId: true,
        tagsJson: true,
        stage: true,
        resultSummaryJson: true,
      },
      orderBy: { submittedAt: "desc" },
      distinct: ["customerId"],
    });

    // 根据 SOP 规则匹配客户
    let matchedCustomers = new Set<string>();
    const archetypeDistribution: Record<string, number> = {};

    for (const attempt of attempts) {
      const tags: string[] = attempt.tagsJson ? JSON.parse(attempt.tagsJson) : [];
      const stage = attempt.stage;

      // 检查是否匹配任一规则
      for (const rule of sop.rules) {
        const requiredTags: string[] = rule.requiredTagsJson 
          ? JSON.parse(rule.requiredTagsJson) 
          : [];
        const excludedTags: string[] = rule.excludedTagsJson 
          ? JSON.parse(rule.excludedTagsJson) 
          : [];

        // 检查阶段
        if (rule.requiredStage && rule.requiredStage !== stage) {
          continue;
        }

        // 检查必须标签
        const hasAllRequired = requiredTags.every(t => tags.includes(t));
        if (!hasAllRequired) continue;

        // 检查排除标签
        const hasExcluded = excludedTags.some(t => tags.includes(t));
        if (hasExcluded) continue;

        // 匹配成功
        matchedCustomers.add(attempt.customerId);

        // 统计画像分布
        try {
          const summary = attempt.resultSummaryJson 
            ? JSON.parse(attempt.resultSummaryJson) 
            : null;
          if (summary?.archetype) {
            archetypeDistribution[summary.archetype] = 
              (archetypeDistribution[summary.archetype] || 0) + 1;
          }
        } catch {
          // ignore
        }

        break; // 匹配一条规则即可
      }
    }

    // 如果没有规则，按阶段匹配
    if (sop.rules.length === 0) {
      for (const attempt of attempts) {
        if (attempt.stage === sop.sopStage) {
          matchedCustomers.add(attempt.customerId);
          try {
            const summary = attempt.resultSummaryJson 
              ? JSON.parse(attempt.resultSummaryJson) 
              : null;
            if (summary?.archetype) {
              archetypeDistribution[summary.archetype] = 
                (archetypeDistribution[summary.archetype] || 0) + 1;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    return NextResponse.json(ok({
      totalCustomers: matchedCustomers.size,
      archetypeDistribution,
    }));
  } catch (error) {
    console.error("Strategy preview error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), { status: 500 });
  }
}
