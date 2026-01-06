/**
 * SOP 匹配引擎
 * 
 * 匹配逻辑：
 * - 输入：stage + tags[]
 * - tags 来源：系统标签（image:*, stability:*, phase:*）+ 助教标签（coach:*）
 * - 匹配：required_stage=stage，required_tags 全包含，excluded_tags 不包含
 * - 排序：priority desc，再 confidence desc
 * - 输出：Top1 SOP
 */

import { PrismaClient } from "@prisma/client";

interface SopMatchResult {
  sopId: string;
  sopName: string;
  stage: string;
  stateSummary: string | null;
  coreGoal: string | null;
  strategyList: string[];
  forbiddenList: string[];
}

/**
 * 匹配 SOP
 * @param prisma PrismaClient 实例
 * @param stage 当前阶段（'pre' | 'mid' | 'post'）
 * @param tags 标签数组（包含系统标签和助教标签）
 * @returns 匹配的 SOP 或 null
 */
export async function matchSOP(
  prisma: PrismaClient,
  stage: string,
  tags: string[]
): Promise<SopMatchResult | null> {
  // 获取所有 active 的 SOP rules（先获取 active 的 SOP，再获取其 rules）
  const activeSops = await prisma.sopDefinition.findMany({
    where: {
      status: "active",
    },
    select: {
      sopId: true,
      priority: true,
    },
  });

  const activeSopIds = activeSops.map((s) => s.sopId);
  const sopPriorityMap = new Map(activeSops.map((s) => [s.sopId, s.priority]));

  // 获取匹配 stage 的 rules
  const rules = await prisma.sopRule.findMany({
    where: {
      status: "active",
      requiredStage: stage,
      sopId: { in: activeSopIds },
    },
    include: {
      sop: true,
    },
  });

  // 过滤匹配的 rules，并按 priority 和 confidence 排序
  const matchedRules = rules
    .filter((rule) => {
    // 解析 required_tags 和 excluded_tags
    const requiredTags = rule.requiredTagsJson
      ? JSON.parse(rule.requiredTagsJson)
      : [];
    const excludedTags = rule.excludedTagsJson
      ? JSON.parse(rule.excludedTagsJson)
      : [];

    // 检查 required_tags 是否全包含
    const hasAllRequired = requiredTags.every((tag: string) =>
      tags.includes(tag)
    );

    // 检查 excluded_tags 是否不包含
    const hasNoExcluded = !excludedTags.some((tag: string) =>
      tags.includes(tag)
    );

      return hasAllRequired && hasNoExcluded && rule.sop;
    })
    .sort((a, b) => {
      // 先按 priority desc
      const priorityA = sopPriorityMap.get(a.sopId) || 0;
      const priorityB = sopPriorityMap.get(b.sopId) || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      // 再按 confidence desc
      return b.confidence - a.confidence;
    });

  if (matchedRules.length === 0) {
    return null;
  }

  // 取第一个匹配的 SOP（已按 priority 和 confidence 排序）
  const matchedRule = matchedRules[0];
  const sop = matchedRule.sop;

  // 解析策略和禁用列表
  const strategyList = sop.strategyListJson
    ? JSON.parse(sop.strategyListJson)
    : [];
  const forbiddenList = sop.forbiddenListJson
    ? JSON.parse(sop.forbiddenListJson)
    : [];

  return {
    sopId: sop.sopId,
    sopName: sop.sopName,
    stage: sop.sopStage,
    stateSummary: sop.stateSummary,
    coreGoal: sop.coreGoal,
    strategyList,
    forbiddenList,
  };
}

/**
 * 获取默认的 realtime_panel（当没有 attempt 时）
 * @param prisma PrismaClient 实例
 * @param stageId 阶段 ID（默认 'pre'）
 * @returns 默认 panel 或 null
 */
export async function getDefaultRealtimePanel(
  prisma: PrismaClient,
  stageId: string = "pre"
) {
  // 查找默认的 coaching_stage
  const stage = await prisma.coachingStage.findUnique({
    where: { stageId },
  });

  if (!stage) {
    return null;
  }

  // 查找该阶段的默认 SOP
  const defaultSopMap = await prisma.sopStageMap.findFirst({
    where: {
      stageId,
      isDefault: true,
      sop: {
        status: "active",
      },
    },
    include: {
      sop: true,
    },
  });

  if (!defaultSopMap || !defaultSopMap.sop) {
    // 如果没有默认 SOP，返回基础 stage 信息
    return {
      stage: stageId,
      stateSummary: stage.stageDesc || "第一段认知建立期",
      coreGoal: "建立信任，了解客户真实需求",
      strategyList: stage.allowActions
        ? JSON.parse(stage.allowActions)
        : ["建立信任", "了解需求"],
      forbiddenList: stage.forbidActions
        ? JSON.parse(stage.forbidActions)
        : ["过度推销", "承诺收益"],
    };
  }

  const sop = defaultSopMap.sop;
  const strategyList = sop.strategyListJson
    ? JSON.parse(sop.strategyListJson)
    : [];
  const forbiddenList = sop.forbiddenListJson
    ? JSON.parse(sop.forbiddenListJson)
    : [];

  return {
    stage: sop.sopStage,
    stateSummary: sop.stateSummary || stage.stageDesc || "第一段认知建立期",
    coreGoal: sop.coreGoal || "建立信任，了解客户真实需求",
    strategyList,
    forbiddenList,
  };
}

