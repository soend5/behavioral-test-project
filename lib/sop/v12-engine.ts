/**
 * SOP V1.2 引擎：标签驱动策略输出
 * 
 * 输入：stage, highlightBehaviorTags, coachTags, displayMap
 * 输出：完整的 realtime panel（含 talkTracks, questions, nextAction, riskNotes, sopVersion, evidence）
 */

import type { DisplayTag } from "../tag-display";
import { getDisplayTag, pickHighlightBehaviorTags } from "../tag-display";

export interface V12RealtimePanelOutput {
  stage: string;
  stageDisplay: {
    labelCn: string;
    explanationCn: string;
  };
  coreGoal: string;
  strategyList: string[];
  talkTracks: string[];
  questions: string[];
  nextAction: string;
  riskNotes: string[];
  sopVersion: string;
  evidence: {
    archetypeLabel?: string;
    highlightBehaviors: Array<{ labelCn: string; explanationCn: string }>;
    coachMarks: string[];
  };
}

/**
 * 获取阶段显示信息
 */
function getStageDisplayLocal(stage: string): {
  labelCn: string;
  explanationCn: string;
} {
  if (stage === "pre") {
    return { labelCn: "解释", explanationCn: "先对齐规则与目标，建立推进节奏" };
  }
  if (stage === "mid") {
    return { labelCn: "反思", explanationCn: "围绕分歧点做复盘，收敛下一步" };
  }
  if (stage === "post") {
    return { labelCn: "执行", explanationCn: "把行动拆到下一步，形成跟进节奏" };
  }
  return { labelCn: "未判定", explanationCn: "暂未形成阶段信号" };
}

/**
 * 根据阶段和标签生成话术模板
 */
function generateTalkTracks(
  stage: string,
  highlightTags: DisplayTag[],
  coachTags: string[]
): string[] {
  const tracks: string[] = [];

  // 根据阶段生成基础话术
  if (stage === "pre") {
    tracks.push("咱们先对齐下规则和边界");
    tracks.push("我会先理解你的习惯");
    tracks.push("然后一起确认下一步怎么推");
  } else if (stage === "mid") {
    tracks.push("咱们围绕分歧点做个复盘");
    tracks.push("看看哪里可以调整");
    tracks.push("然后收敛到下一步动作");
  } else if (stage === "post") {
    tracks.push("咱们把下一步动作拆细");
    tracks.push("确保可执行可跟进");
    tracks.push("然后按节奏往前推");
  }

  // 根据 highlight 标签微调
  if (highlightTags.length > 0) {
    const firstTag = highlightTags[0];
    if (firstTag.group === "consistency" && firstTag.level === "low") {
      tracks[2] = "节奏容易反复，我会多拉你对齐";
    } else if (firstTag.group === "risk" && firstTag.level === "high") {
      tracks[1] = "先把风险点收住，再推进";
    } else if (firstTag.group === "emotion" && firstTag.level === "high") {
      tracks[0] = "反馈变化快时，我们先停下对齐";
    }
  }

  return tracks.slice(0, 3); // 最多3条
}

/**
 * 根据阶段和标签生成必问追问
 */
function generateQuestions(
  stage: string,
  highlightTags: DisplayTag[]
): string[] {
  const questions: string[] = [];

  if (stage === "pre") {
    questions.push("你现在最想搞清楚的是什么？");
    questions.push("之前有哪些地方让你觉得不清楚？");
  } else if (stage === "mid") {
    questions.push("哪个环节跟你想的不一样？");
    questions.push("如果重来一次，你会怎么调整？");
  } else if (stage === "post") {
    questions.push("下一步具体要做什么？");
    questions.push("怎么判断这一步做到位了？");
  }

  return questions.slice(0, 2); // 最多2个
}

/**
 * 根据阶段生成下一步动作
 */
function generateNextAction(stage: string): string {
  if (stage === "pre") {
    return "对齐规则与边界，确认推进目标";
  }
  if (stage === "mid") {
    return "围绕分歧点做复盘，收敛下一步";
  }
  if (stage === "post") {
    return "把行动拆到下一步，形成跟进节奏";
  }
  return "对齐当前目标与边界";
}

/**
 * 生成风险提醒（合规/沟通踩坑）
 */
function generateRiskNotes(stage: string): string[] {
  const notes: string[] = [];

  // 合规提醒（所有阶段）
  notes.push("不提供买卖建议，不承诺收益");

  // 根据阶段添加沟通提醒
  if (stage === "pre") {
    notes.push("避免过度推销，先建立信任");
  } else if (stage === "mid") {
    notes.push("避免评判对错，引导反思");
  } else if (stage === "post") {
    notes.push("避免代替决策，引导自主执行");
  }

  return notes.slice(0, 2); // 最多2条
}

/**
 * 生成 V1.2 realtime panel
 */
export function generateV12RealtimePanel(
  stage: string,
  systemTags: string[],
  coachTags: string[],
  baseCoreGoal?: string | null,
  baseStrategyList?: string[] | null
): V12RealtimePanelOutput {
  const stageDisplay = getStageDisplayLocal(stage);

  // 提取 archetype 标签
  const archetypeTag = systemTags.find((t) => t.startsWith("image:"));
  const archetypeDisplay = archetypeTag ? getDisplayTag(archetypeTag) : null;

  // 提取 highlight behavior tags
  const highlightTags = pickHighlightBehaviorTags(systemTags, { max: 2 });

  // 提取 coach 标签（过滤掉 coach:coach_stage_* 等系统标签）
  const coachMarks = coachTags
    .filter((t) => !t.startsWith("coach:coach_stage"))
    .map((t) => {
      const display = getDisplayTag(t);
      return display ? display.labelCn : t;
    });

  // 生成话术、追问、下一步、风险提醒
  const talkTracks = generateTalkTracks(stage, highlightTags, coachTags);
  const questions = generateQuestions(stage, highlightTags);
  const nextAction = generateNextAction(stage);
  const riskNotes = generateRiskNotes(stage);

  // 使用基础策略或生成默认策略
  let strategyList = baseStrategyList || [];
  if (strategyList.length === 0) {
    if (stage === "pre") {
      strategyList = ["建立信任", "了解需求", "对齐目标"];
    } else if (stage === "mid") {
      strategyList = ["复盘分歧点", "收敛下一步", "调整推进节奏"];
    } else if (stage === "post") {
      strategyList = ["拆解行动", "确认跟进节奏", "形成执行闭环"];
    }
  }

  return {
    stage,
    stageDisplay,
    coreGoal: baseCoreGoal || `${stageDisplay.labelCn}阶段：${stageDisplay.explanationCn}`,
    strategyList: strategyList.slice(0, 3),
    talkTracks,
    questions,
    nextAction,
    riskNotes,
    sopVersion: "sop_v1.2.0",
    evidence: {
      archetypeLabel: archetypeDisplay?.labelCn,
      highlightBehaviors: highlightTags.map((t) => ({
        labelCn: t.labelCn,
        explanationCn: t.explanationCn,
      })),
      coachMarks,
    },
  };
}
