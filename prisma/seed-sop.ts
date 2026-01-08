import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Seed minimal default SOP configuration (idempotent).
 *
 * Why:
 * - Admin "SOP 配置管理" 依赖 sop_definition 数据；若从未初始化，会导致页面空白（API 200 + 空数组）。
 *
 * Safety:
 * - 只做“缺什么补什么”，不覆盖/不更新已有 SOP 配置。
 * - 默认 stage map 仅在该 stage 尚无 default 时写入（避免触发 partial unique index）。
 */
export async function seedSopDefaults(prisma: DbClient) {
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
  let createdStageMaps = 0;

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

    // Ensure a default mapping exists per stage (without overriding existing default).
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

  console.log(`- sop defaults: +${createdDefinitions} definitions, +${createdStageMaps} default stage maps`);
}

