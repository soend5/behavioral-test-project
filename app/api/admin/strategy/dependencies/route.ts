import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

/**
 * GET /api/admin/strategy/dependencies
 * 获取配置依赖关系数据
 */
export async function GET() {
  try {
    await requireAdmin();

    // 获取所有 SOP
    const sops = await prisma.sopDefinition.findMany({
      where: { status: "active" },
      include: {
        rules: {
          where: { status: "active" }
        }
      }
    });

    // 获取所有话术
    const scripts = await prisma.scriptTemplate.findMany({
      where: { status: "active" }
    });

    // 获取所有标签（从 CoachTag 提取唯一值）
    const coachTags = await prisma.coachTag.findMany({
      select: { tagKey: true },
      distinct: ["tagKey"]
    });

    // 构建节点
    const nodes = [
      ...sops.map(s => ({
        id: `sop-${s.sopId}`,
        type: "sop" as const,
        name: s.sopName,
        stage: s.sopStage
      })),
      ...scripts.map(s => ({
        id: `script-${s.id}`,
        type: "script" as const,
        name: s.name,
        stage: s.triggerStage || undefined
      })),
      ...coachTags.map(t => ({
        id: `tag-${t.tagKey}`,
        type: "tag" as const,
        name: t.tagKey,
        stage: undefined
      }))
    ];

    // 构建边（关系）
    const edges: Array<{ source: string; target: string; relation: string }> = [];

    // SOP -> Tag 关系（从规则的 requiredTags）
    for (const sop of sops) {
      for (const rule of sop.rules) {
        const requiredTags = parseTags(rule.requiredTagsJson);
        for (const tagKey of requiredTags) {
          edges.push({
            source: `sop-${sop.sopId}`,
            target: `tag-${tagKey}`,
            relation: "触发"
          });
        }
      }
    }

    // Script -> SOP 关系
    for (const script of scripts) {
      if (script.sopId) {
        edges.push({
          source: `script-${script.id}`,
          target: `sop-${script.sopId}`,
          relation: "关联"
        });
      }
    }

    // Script -> Tag 关系（从 triggerTags）
    for (const script of scripts) {
      const triggerTags = parseTags(script.triggerTagsJson);
      for (const tagKey of triggerTags) {
        edges.push({
          source: `script-${script.id}`,
          target: `tag-${tagKey}`,
          relation: "触发"
        });
      }
    }

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Failed to fetch dependencies:", error);
    return NextResponse.json(
      { error: "获取依赖关系失败" },
      { status: 500 }
    );
  }
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return tagsJson.split(",").map(t => t.trim()).filter(Boolean);
  }
}
