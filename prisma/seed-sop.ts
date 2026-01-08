import type { Prisma, PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Seed SOP configuration (idempotent).
 *
 * 包含：
 * - 默认 SOP（sop_pre_default, sop_mid_default, sop_post_default）
 * - v1.2 营销导向 SOP（6 个新增 SOP + 18 条匹配规则）
 *
 * Safety:
 * - 使用 upsert 实现幂等，重复执行不会重复插入
 * - 默认 stage map 仅在该 stage 尚无 default 时写入
 */
export async function seedSopDefaults(prisma: DbClient) {
  // 1. 默认 SOP（保持向后兼容）
  const defaults = [
    {
      sopId: "sop_pre_default",
      sopName: "默认 SOP（解释）",
      sopStage: "pre",
      status: "active",
      priority: 0,
      stateSummary: "推进前先把规则、边界与目标对齐",
      coreGoal: "对齐规则与边界，确认推进目标",
      strategyListJson: JSON.stringify(["建立信任", "了解真实诉求", "对齐目标与边界"]),
      forbiddenListJson: JSON.stringify(["承诺收益", "替代决策", "过度推销"]),
      notes: "seed: minimal default sop for pre",
    },
    {
      sopId: "sop_mid_default",
      sopName: "默认 SOP（反思）",
      sopStage: "mid",
      status: "active",
      priority: 0,
      stateSummary: "围绕分歧点复盘，收敛下一步动作",
      coreGoal: "围绕分歧点做复盘，收敛下一步",
      strategyListJson: JSON.stringify(["复盘分歧点", "收敛下一步", "调整推进节奏"]),
      forbiddenListJson: JSON.stringify(["评判对错", "施加压力", "夸大确定性"]),
      notes: "seed: minimal default sop for mid",
    },
    {
      sopId: "sop_post_default",
      sopName: "默认 SOP（执行）",
      sopStage: "post",
      status: "active",
      priority: 0,
      stateSummary: "把行动拆到下一步，形成可跟进节奏",
      coreGoal: "把行动拆到下一步，形成跟进节奏",
      strategyListJson: JSON.stringify(["拆解行动", "确认检查点", "形成跟进节奏"]),
      forbiddenListJson: JSON.stringify(["代替执行", "频繁打扰", "用结果施压"]),
      notes: "seed: minimal default sop for post",
    },
  ] as const;

  let createdDefinitions = 0;
  let updatedDefinitions = 0;
  let createdStageMaps = 0;
  let createdRules = 0;
  let updatedRules = 0;

  // 2. 导入默认 SOP
  for (const def of defaults) {
    const exists = await prisma.sopDefinition.findUnique({
      where: { sopId: def.sopId },
      select: { sopId: true },
    });
    if (!exists) {
      await prisma.sopDefinition.create({
        data: {
          sopId: def.sopId,
          sopName: def.sopName,
          sopStage: def.sopStage,
          status: def.status,
          priority: def.priority,
          stateSummary: def.stateSummary,
          coreGoal: def.coreGoal,
          strategyListJson: def.strategyListJson,
          forbiddenListJson: def.forbiddenListJson,
          notes: def.notes,
        },
      });
      createdDefinitions += 1;
    }

    // Ensure a default mapping exists per stage
    const stageId = def.sopStage;
    const hasDefault = await prisma.sopStageMap.findFirst({
      where: { stageId, isDefault: true },
      select: { id: true },
    });
    if (hasDefault) continue;

    const mapExists = await prisma.sopStageMap.findUnique({
      where: { sopId_stageId: { sopId: def.sopId, stageId } },
      select: { id: true, isDefault: true },
    });

    if (!mapExists) {
      await prisma.sopStageMap.create({
        data: {
          sopId: def.sopId,
          stageId,
          isDefault: true,
          remark: "seed: default map",
        },
      });
      createdStageMaps += 1;
    }
  }

  // 3. 导入 v1.2 SOP 配置（从 JSON 文件）
  const sopConfigPath = path.join(process.cwd(), "data/seed/sop_config_v1.2.json");
  if (fs.existsSync(sopConfigPath)) {
    const sopConfigRaw = fs.readFileSync(sopConfigPath, "utf-8");
    const sopConfig = JSON.parse(sopConfigRaw) as {
      version: string;
      sop_definitions: Array<{
        sop_id: string;
        sop_name: string;
        sop_stage: string;
        status: string;
        priority: number;
        state_summary: string;
        core_goal: string;
        strategy_list: string[];
        forbidden_list: string[];
        talk_tracks: string[];
        questions: string[];
        next_action: string;
        risk_notes: string[];
        evidence_display: string[];
        notes: string;
      }>;
      sop_rules: Array<{
        rule_id: string;
        sop_id: string;
        required_stage: string;
        required_tags: string[];
        excluded_tags: string[];
        confidence: number;
        status: string;
      }>;
    };

    console.log(`- loading sop_config ${sopConfig.version}...`);

    // 3.1 导入 SOP Definitions
    for (const def of sopConfig.sop_definitions) {
      // 将扩展字段存入 notes（JSON 格式），保持 schema 不变
      const extendedData = {
        talk_tracks: def.talk_tracks,
        questions: def.questions,
        next_action: def.next_action,
        risk_notes: def.risk_notes,
        evidence_display: def.evidence_display,
        sop_version: sopConfig.version,
        original_notes: def.notes,
      };

      const exists = await prisma.sopDefinition.findUnique({
        where: { sopId: def.sop_id },
        select: { sopId: true },
      });

      if (!exists) {
        await prisma.sopDefinition.create({
          data: {
            sopId: def.sop_id,
            sopName: def.sop_name,
            sopStage: def.sop_stage,
            status: def.status,
            priority: def.priority,
            stateSummary: def.state_summary,
            coreGoal: def.core_goal,
            strategyListJson: JSON.stringify(def.strategy_list),
            forbiddenListJson: JSON.stringify(def.forbidden_list),
            notes: JSON.stringify(extendedData),
          },
        });
        createdDefinitions += 1;
      } else {
        // 更新已存在的 SOP（保持幂等）
        await prisma.sopDefinition.update({
          where: { sopId: def.sop_id },
          data: {
            sopName: def.sop_name,
            sopStage: def.sop_stage,
            status: def.status,
            priority: def.priority,
            stateSummary: def.state_summary,
            coreGoal: def.core_goal,
            strategyListJson: JSON.stringify(def.strategy_list),
            forbiddenListJson: JSON.stringify(def.forbidden_list),
            notes: JSON.stringify(extendedData),
          },
        });
        updatedDefinitions += 1;
      }
    }

    // 3.2 导入 SOP Rules
    for (const rule of sopConfig.sop_rules) {
      const exists = await prisma.sopRule.findUnique({
        where: { ruleId: rule.rule_id },
        select: { ruleId: true },
      });

      if (!exists) {
        await prisma.sopRule.create({
          data: {
            ruleId: rule.rule_id,
            sopId: rule.sop_id,
            requiredStage: rule.required_stage,
            requiredTagsJson: JSON.stringify(rule.required_tags),
            excludedTagsJson: rule.excluded_tags.length > 0 ? JSON.stringify(rule.excluded_tags) : null,
            confidence: rule.confidence,
            status: rule.status,
          },
        });
        createdRules += 1;
      } else {
        // 更新已存在的规则（保持幂等）
        await prisma.sopRule.update({
          where: { ruleId: rule.rule_id },
          data: {
            sopId: rule.sop_id,
            requiredStage: rule.required_stage,
            requiredTagsJson: JSON.stringify(rule.required_tags),
            excludedTagsJson: rule.excluded_tags.length > 0 ? JSON.stringify(rule.excluded_tags) : null,
            confidence: rule.confidence,
            status: rule.status,
          },
        });
        updatedRules += 1;
      }
    }
  }

  console.log(`- sop defaults: +${createdDefinitions} created, ~${updatedDefinitions} updated definitions`);
  console.log(`- sop rules: +${createdRules} created, ~${updatedRules} updated rules`);
  console.log(`- sop stage maps: +${createdStageMaps} default stage maps`);
}
