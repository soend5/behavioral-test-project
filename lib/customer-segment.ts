/**
 * v1.7: 客户分层系统
 * 自动计算客户分层标签
 */

import { Prisma } from "@prisma/client";

// 分层定义
export const SEGMENT_DEFINITIONS = {
  high_potential: {
    key: "high_potential",
    name: "高潜力",
    color: "gold",
    description: "完成深度测评且稳定性高的客户",
    priority: 1,
  },
  needs_attention: {
    key: "needs_attention",
    name: "需关注",
    color: "red",
    description: "冲动反应型或稳定性低的客户",
    priority: 2,
  },
  active: {
    key: "active",
    name: "活跃",
    color: "green",
    description: "7天内有互动的客户",
    priority: 3,
  },
  inactive: {
    key: "inactive",
    name: "沉默",
    color: "gray",
    description: "超过14天无互动的客户",
    priority: 4,
  },
  new: {
    key: "new",
    name: "新客户",
    color: "blue",
    description: "7天内新增的客户",
    priority: 5,
  },
} as const;

export type SegmentKey = keyof typeof SEGMENT_DEFINITIONS;

// 客户数据类型（用于分层计算）
export type CustomerForSegment = {
  id: string;
  createdAt: Date;
  attempts: Array<{
    id: string;
    version: string;
    submittedAt: Date | null;
    stage: string | null;
    tagsJson: string | null;
    resultSummaryJson: string | null;
  }>;
  followUpLogs: Array<{
    id: string;
    createdAt: Date;
  }>;
  coachTags: Array<{
    tagKey: string;
  }>;
};

/**
 * 计算客户的分层标签
 */
export function calculateSegments(customer: CustomerForSegment): Array<{
  segment: SegmentKey;
  score: number;
  reason: string;
}> {
  const segments: Array<{ segment: SegmentKey; score: number; reason: string }> = [];
  const now = new Date();

  // 获取最新测评
  const latestAttempt = customer.attempts
    .filter((a) => a.submittedAt)
    .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())[0];

  // 解析测评结果
  let archetype: string | null = null;
  let stability: string | null = null;
  let tags: string[] = [];

  if (latestAttempt) {
    if (latestAttempt.resultSummaryJson) {
      try {
        const summary = JSON.parse(latestAttempt.resultSummaryJson);
        archetype = summary.archetype || null;
      } catch {}
    }
    if (latestAttempt.tagsJson) {
      try {
        tags = JSON.parse(latestAttempt.tagsJson);
        // 从标签中提取稳定性
        const stabilityTag = tags.find((t) => t.startsWith("stability:"));
        if (stabilityTag) {
          stability = stabilityTag.split(":")[1];
        }
      } catch {}
    }
  }

  // 计算最后活动时间
  const lastActivityDates: Date[] = [];
  if (latestAttempt?.submittedAt) {
    lastActivityDates.push(new Date(latestAttempt.submittedAt));
  }
  if (customer.followUpLogs.length > 0) {
    lastActivityDates.push(new Date(customer.followUpLogs[0].createdAt));
  }
  const lastActivity = lastActivityDates.length > 0
    ? new Date(Math.max(...lastActivityDates.map((d) => d.getTime())))
    : customer.createdAt;
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  // 计算客户年龄
  const daysSinceCreated = Math.floor((now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // 1. 高潜力：深度测评 + 高稳定性
  if (latestAttempt?.version === "pro" && stability === "high") {
    segments.push({
      segment: "high_potential",
      score: 100,
      reason: "完成深度测评且稳定性高",
    });
  }

  // 2. 需关注：冲动反应型 或 低稳定性
  if (archetype === "impulsive_reactor" || stability === "low") {
    const reasons: string[] = [];
    if (archetype === "impulsive_reactor") reasons.push("冲动反应型");
    if (stability === "low") reasons.push("稳定性低");
    segments.push({
      segment: "needs_attention",
      score: 80,
      reason: reasons.join("，"),
    });
  }

  // 3. 新客户：7天内创建
  if (daysSinceCreated <= 7) {
    segments.push({
      segment: "new",
      score: 50,
      reason: `${daysSinceCreated}天前加入`,
    });
  }

  // 4. 活跃：7天内有活动
  if (daysSinceActivity <= 7) {
    segments.push({
      segment: "active",
      score: 60,
      reason: `${daysSinceActivity}天前有活动`,
    });
  }

  // 5. 沉默：超过14天无活动
  if (daysSinceActivity > 14) {
    segments.push({
      segment: "inactive",
      score: 30,
      reason: `${daysSinceActivity}天无活动`,
    });
  }

  return segments;
}

/**
 * 获取分层显示信息
 */
export function getSegmentDisplay(segment: string): {
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
} {
  const def = SEGMENT_DEFINITIONS[segment as SegmentKey];
  if (!def) {
    return {
      name: segment,
      color: "gray",
      bgClass: "bg-gray-100",
      textClass: "text-gray-700",
    };
  }

  const colorMap: Record<string, { bgClass: string; textClass: string }> = {
    gold: { bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
    red: { bgClass: "bg-red-100", textClass: "text-red-700" },
    green: { bgClass: "bg-green-100", textClass: "text-green-700" },
    gray: { bgClass: "bg-gray-100", textClass: "text-gray-600" },
    blue: { bgClass: "bg-blue-100", textClass: "text-blue-700" },
  };

  const colors = colorMap[def.color] || colorMap.gray;

  return {
    name: def.name,
    color: def.color,
    ...colors,
  };
}
