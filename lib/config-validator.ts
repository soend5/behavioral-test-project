/**
 * 配置冲突检测
 * 检测 SOP 规则冲突、话术一致性、无效标签等问题
 */

import { PrismaClient } from "@prisma/client";

// ============================================
// 类型定义
// ============================================

export type ConflictType = 
  | "sop_trigger_overlap"      // SOP 触发条件重叠
  | "script_sop_mismatch"      // 话术与 SOP 阶段不匹配
  | "invalid_tag"              // 无效标签引用
  | "circular_dependency"      // 循环依赖
  | "orphan_script";           // 孤立话术（无 SOP 关联）

export type ConflictSeverity = "error" | "warning" | "info";

export interface ConfigConflict {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  details: {
    sourceType: string;
    sourceId: string;
    sourceName: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  conflicts: ConfigConflict[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// ============================================
// SOP 规则冲突检测
// ============================================

/**
 * 检测 SOP 触发条件重叠
 * 当多个 SOP 规则的触发条件（标签组合）存在重叠时报告冲突
 */
export async function detectSopTriggerOverlap(
  prisma: PrismaClient
): Promise<ConfigConflict[]> {
  const conflicts: ConfigConflict[] = [];
  
  // 获取所有活跃的 SOP 及其规则
  const sops = await prisma.sopDefinition.findMany({
    where: { status: "active" },
    include: {
      rules: {
        where: { status: "active" }
      }
    }
  });

  // 比较每对 SOP 的触发标签
  for (let i = 0; i < sops.length; i++) {
    for (let j = i + 1; j < sops.length; j++) {
      const sopA = sops[i];
      const sopB = sops[j];
      
      // 同阶段的 SOP 检查触发条件重叠
      if (sopA.sopStage === sopB.sopStage) {
        // 检查规则的 requiredTags 重叠
        for (const ruleA of sopA.rules) {
          for (const ruleB of sopB.rules) {
            const tagsA = parseTags(ruleA.requiredTagsJson);
            const tagsB = parseTags(ruleB.requiredTagsJson);
            
            const overlap = tagsA.filter(t => tagsB.includes(t));
            
            if (overlap.length > 0 && overlap.length === tagsA.length && tagsA.length === tagsB.length) {
              conflicts.push({
                type: "sop_trigger_overlap",
                severity: "warning",
                message: `SOP "${sopA.sopName}" 与 "${sopB.sopName}" 触发条件完全重叠`,
                details: {
                  sourceType: "sop",
                  sourceId: sopA.sopId,
                  sourceName: sopA.sopName,
                  targetType: "sop",
                  targetId: sopB.sopId,
                  targetName: sopB.sopName
                }
              });
            }
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * 检测话术与 SOP 阶段一致性
 */
export async function detectScriptSopMismatch(
  prisma: PrismaClient
): Promise<ConfigConflict[]> {
  const conflicts: ConfigConflict[] = [];

  const scripts = await prisma.scriptTemplate.findMany({
    where: { status: "active" },
    include: {
      sop: true
    }
  });

  for (const script of scripts) {
    if (script.sop && script.triggerStage && script.triggerStage !== script.sop.sopStage) {
      conflicts.push({
        type: "script_sop_mismatch",
        severity: "error",
        message: `话术 "${script.name}" 阶段(${script.triggerStage})与关联 SOP "${script.sop.sopName}" 阶段(${script.sop.sopStage})不匹配`,
        details: {
          sourceType: "script",
          sourceId: script.id,
          sourceName: script.name,
          targetType: "sop",
          targetId: script.sop.sopId,
          targetName: script.sop.sopName
        }
      });
    }
  }

  return conflicts;
}

/**
 * 检测无效标签引用（检查 SOP 规则中的标签）
 */
export async function detectInvalidTags(
  prisma: PrismaClient
): Promise<ConfigConflict[]> {
  const conflicts: ConfigConflict[] = [];

  // 获取所有有效标签（从 CoachTag 中提取唯一的 tagKey）
  const coachTags = await prisma.coachTag.findMany({
    select: { tagKey: true },
    distinct: ["tagKey"]
  });
  const validTagKeys = new Set(coachTags.map(t => t.tagKey));

  // 检查 SOP 规则中的标签
  const sopRules = await prisma.sopRule.findMany({
    where: { status: "active" },
    include: {
      sop: true
    }
  });

  for (const rule of sopRules) {
    const requiredTags = parseTags(rule.requiredTagsJson);
    const excludedTags = parseTags(rule.excludedTagsJson);
    const allTags = [...requiredTags, ...excludedTags];
    
    for (const tag of allTags) {
      // 跳过系统标签（以 sys_ 开头）
      if (tag.startsWith("sys_")) continue;
      
      if (!validTagKeys.has(tag) && validTagKeys.size > 0) {
        conflicts.push({
          type: "invalid_tag",
          severity: "warning",
          message: `SOP "${rule.sop.sopName}" 规则引用了未使用的标签: ${tag}`,
          details: {
            sourceType: "sop_rule",
            sourceId: rule.ruleId,
            sourceName: `${rule.sop.sopName} - 规则`
          }
        });
      }
    }
  }

  return conflicts;
}

/**
 * 检测孤立话术（无 SOP 关联）
 */
export async function detectOrphanScripts(
  prisma: PrismaClient
): Promise<ConfigConflict[]> {
  const conflicts: ConfigConflict[] = [];

  const orphanScripts = await prisma.scriptTemplate.findMany({
    where: {
      status: "active",
      sopId: null
    }
  });

  for (const script of orphanScripts) {
    conflicts.push({
      type: "orphan_script",
      severity: "info",
      message: `话术 "${script.name}" 未关联任何 SOP`,
      details: {
        sourceType: "script",
        sourceId: script.id,
        sourceName: script.name
      }
    });
  }

  return conflicts;
}

// ============================================
// 综合验证
// ============================================

/**
 * 执行全量配置验证
 */
export async function validateAllConfigs(
  prisma: PrismaClient
): Promise<ValidationResult> {
  const allConflicts: ConfigConflict[] = [];

  // 并行执行所有检测
  const [sopOverlaps, scriptMismatches, invalidTags, orphanScripts] = 
    await Promise.all([
      detectSopTriggerOverlap(prisma),
      detectScriptSopMismatch(prisma),
      detectInvalidTags(prisma),
      detectOrphanScripts(prisma)
    ]);

  allConflicts.push(...sopOverlaps, ...scriptMismatches, ...invalidTags, ...orphanScripts);

  const summary = {
    errors: allConflicts.filter(c => c.severity === "error").length,
    warnings: allConflicts.filter(c => c.severity === "warning").length,
    info: allConflicts.filter(c => c.severity === "info").length
  };

  return {
    valid: summary.errors === 0,
    conflicts: allConflicts,
    summary
  };
}

/**
 * 验证单个 SOP 配置
 */
export async function validateSopConfig(
  prisma: PrismaClient,
  sopId: string
): Promise<ValidationResult> {
  const conflicts: ConfigConflict[] = [];

  const sop = await prisma.sopDefinition.findUnique({
    where: { sopId },
    include: {
      rules: { where: { status: "active" } }
    }
  });

  if (!sop) {
    return { valid: false, conflicts: [], summary: { errors: 1, warnings: 0, info: 0 } };
  }

  // 获取有效标签
  const coachTags = await prisma.coachTag.findMany({
    select: { tagKey: true },
    distinct: ["tagKey"]
  });
  const validTagKeys = new Set(coachTags.map(t => t.tagKey));

  // 检查规则中的标签有效性
  for (const rule of sop.rules) {
    const tags = [...parseTags(rule.requiredTagsJson), ...parseTags(rule.excludedTagsJson)];
    
    for (const tag of tags) {
      if (tag.startsWith("sys_")) continue;
      
      if (!validTagKeys.has(tag) && validTagKeys.size > 0) {
        conflicts.push({
          type: "invalid_tag",
          severity: "warning",
          message: `规则引用了未使用的标签: ${tag}`,
          details: {
            sourceType: "sop_rule",
            sourceId: rule.ruleId,
            sourceName: sop.sopName
          }
        });
      }
    }
  }

  // 检查与其他 SOP 的冲突
  const otherSops = await prisma.sopDefinition.findMany({
    where: { 
      status: "active", 
      sopId: { not: sopId }, 
      sopStage: sop.sopStage 
    },
    include: {
      rules: { where: { status: "active" } }
    }
  });

  for (const other of otherSops) {
    for (const ruleA of sop.rules) {
      for (const ruleB of other.rules) {
        const tagsA = parseTags(ruleA.requiredTagsJson);
        const tagsB = parseTags(ruleB.requiredTagsJson);
        const overlap = tagsA.filter(t => tagsB.includes(t));
        
        if (overlap.length > 0 && overlap.length === tagsA.length && tagsA.length === tagsB.length) {
          conflicts.push({
            type: "sop_trigger_overlap",
            severity: "warning",
            message: `与 SOP "${other.sopName}" 触发条件重叠`,
            details: {
              sourceType: "sop",
              sourceId: sop.sopId,
              sourceName: sop.sopName,
              targetType: "sop",
              targetId: other.sopId,
              targetName: other.sopName
            }
          });
        }
      }
    }
  }

  const summary = {
    errors: conflicts.filter(c => c.severity === "error").length,
    warnings: conflicts.filter(c => c.severity === "warning").length,
    info: conflicts.filter(c => c.severity === "info").length
  };

  return { valid: summary.errors === 0, conflicts, summary };
}

// ============================================
// 工具函数
// ============================================

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return tagsJson.split(",").map(t => t.trim()).filter(Boolean);
  }
}
