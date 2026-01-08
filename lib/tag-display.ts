export type TagLevel = "high" | "medium" | "low";

export type DisplayTagKind = "archetype" | "stability" | "phase" | "behavior" | "coach";

export type DisplayTag = {
  tag: string;
  kind: DisplayTagKind;
  labelCn: string;
  explanationCn: string;
  group?: string;
  level?: TagLevel;
};

const ARCHETYPE_DISPLAY: Record<string, { labelCn: string; explanationCn: string }> = {
  rule_executor: {
    labelCn: "推进方式：规则对齐",
    explanationCn: "更习惯先对齐规则/边界再推进",
  },
  emotion_driven: {
    labelCn: "推进方式：受感受牵引",
    explanationCn: "反馈强烈时节奏更容易被带动",
  },
  experience_reliant: {
    labelCn: "推进方式：依赖既有经验",
    explanationCn: "更常用熟悉打法来判断下一步",
  },
  opportunity_seeker: {
    labelCn: "推进方式：关注新机会",
    explanationCn: "更容易被新信息吸引而调整方向",
  },
  defensive_observer: {
    labelCn: "推进方式：谨慎观望",
    explanationCn: "不明朗时更倾向先观察再行动",
  },
  impulsive_reactor: {
    labelCn: "推进方式：快速反应",
    explanationCn: "更容易先动起来，再边做边校准",
  },
};

const STABILITY_DISPLAY: Record<TagLevel, { labelCn: string; explanationCn: string }> = {
  high: { labelCn: "回答集中度：高", explanationCn: "本次选择更集中，信号更清晰" },
  medium: { labelCn: "回答集中度：中", explanationCn: "本次选择有一定集中度" },
  low: { labelCn: "回答集中度：低", explanationCn: "本次选择较分散，信号更分布" },
};

const PHASE_DISPLAY: Record<string, { labelCn: string; explanationCn: string }> = {
  fast_completed: { labelCn: "完成状态：Fast 已完成", explanationCn: "快速测评已提交" },
  pro_completed: { labelCn: "完成状态：Pro 已完成", explanationCn: "专业测评已提交" },
};

const BEHAVIOR_GROUP_DISPLAY: Record<
  string,
  {
    titleCn: string;
    byLevel: Record<TagLevel, { labelCn: string; explanationCn: string }>;
  }
> = {
  rule: {
    titleCn: "规则依赖",
    byLevel: {
      high: { labelCn: "规则依赖：偏高", explanationCn: "推进前更需要明确规则/流程" },
      medium: { labelCn: "规则依赖：中等", explanationCn: "会参考规则，也会按情况调整" },
      low: { labelCn: "规则依赖：偏低", explanationCn: "更愿意边做边校准，不强求先行" },
    },
  },
  risk: {
    titleCn: "风险防御",
    byLevel: {
      high: { labelCn: "风险防御：偏高", explanationCn: "更倾向先把风险收住再推进" },
      medium: { labelCn: "风险防御：中等", explanationCn: "风险与机会会一起权衡" },
      low: { labelCn: "风险防御：偏低", explanationCn: "更愿意先试再逐步收敛风险" },
    },
  },
  emotion: {
    titleCn: "情绪介入",
    byLevel: {
      high: { labelCn: "情绪介入：偏高", explanationCn: "反馈变化会明显影响推进节奏" },
      medium: { labelCn: "情绪介入：中等", explanationCn: "会受影响，但能回到任务" },
      low: { labelCn: "情绪介入：偏低", explanationCn: "节奏较少被情绪带走" },
    },
  },
  consistency: {
    titleCn: "行动一致性",
    byLevel: {
      high: { labelCn: "行动一致性：偏高", explanationCn: "更能按既定节奏推进" },
      medium: { labelCn: "行动一致性：中等", explanationCn: "能推进，但会被事件打断" },
      low: { labelCn: "行动一致性：偏低", explanationCn: "节奏容易反复，需要外部牵引" },
    },
  },
  opportunity: {
    titleCn: "机会敏感",
    byLevel: {
      high: { labelCn: "机会敏感：偏高", explanationCn: "更容易被新信息吸引而转向" },
      medium: { labelCn: "机会敏感：中等", explanationCn: "会看新机会，但会先对齐" },
      low: { labelCn: "机会敏感：偏低", explanationCn: "更专注当前路径，不轻易换方向" },
    },
  },
  experience: {
    titleCn: "经验依赖",
    byLevel: {
      high: { labelCn: "经验依赖：偏高", explanationCn: "更相信熟悉路径来做判断" },
      medium: { labelCn: "经验依赖：中等", explanationCn: "会用经验，也会听新反馈" },
      low: { labelCn: "经验依赖：偏低", explanationCn: "更愿意用新反馈更新判断" },
    },
  },
};

function parseTagPair(tag: string): { prefix: string; value: string } | null {
  const idx = tag.indexOf(":");
  if (idx <= 0) return null;
  const prefix = tag.slice(0, idx);
  const value = tag.slice(idx + 1);
  if (!prefix || !value) return null;
  return { prefix, value };
}

function isLevel(value: string): value is TagLevel {
  return value === "high" || value === "medium" || value === "low";
}

export function getDisplayTag(tag: string): DisplayTag | null {
  if (tag.startsWith("coach:")) {
    const raw = tag.slice("coach:".length).trim();
    return {
      tag,
      kind: "coach",
      labelCn: raw ? `助教标记：${raw}` : "助教标记",
      explanationCn: "助教内部标记（不影响参与者端展示）",
    };
  }

  const pair = parseTagPair(tag);
  if (!pair) return null;

  if (pair.prefix === "image") {
    const meta = ARCHETYPE_DISPLAY[pair.value];
    if (!meta) return null;
    return { tag, kind: "archetype", labelCn: meta.labelCn, explanationCn: meta.explanationCn };
  }

  if (pair.prefix === "stability") {
    if (!isLevel(pair.value)) return null;
    const meta = STABILITY_DISPLAY[pair.value];
    return { tag, kind: "stability", labelCn: meta.labelCn, explanationCn: meta.explanationCn };
  }

  if (pair.prefix === "phase") {
    const meta = PHASE_DISPLAY[pair.value];
    if (!meta) return null;
    return { tag, kind: "phase", labelCn: meta.labelCn, explanationCn: meta.explanationCn };
  }

  const group = BEHAVIOR_GROUP_DISPLAY[pair.prefix];
  if (group && isLevel(pair.value)) {
    const meta = group.byLevel[pair.value];
    return {
      tag,
      kind: "behavior",
      labelCn: meta.labelCn,
      explanationCn: meta.explanationCn,
      group: pair.prefix,
      level: pair.value,
    };
  }

  return null;
}

export function pickHighlightBehaviorTags(
  tags: string[],
  opts: { max: number } = { max: 2 }
): DisplayTag[] {
  const max = Math.max(0, Math.min(2, opts.max));
  if (max === 0) return [];

  const weightByLevel: Record<TagLevel, number> = { high: 3, medium: 1, low: 3 };
  const groupPriority = ["consistency", "risk", "rule", "emotion", "opportunity", "experience"];

  const candidates = tags
    .map(getDisplayTag)
    .filter((t): t is DisplayTag => Boolean(t))
    .filter((t) => t.kind === "behavior" && t.group && t.level)
    .sort((a, b) => {
      const w = weightByLevel[b.level as TagLevel] - weightByLevel[a.level as TagLevel];
      if (w !== 0) return w;
      const pa = groupPriority.indexOf(a.group ?? "");
      const pb = groupPriority.indexOf(b.group ?? "");
      if (pa !== pb) return pa - pb;
      return a.tag.localeCompare(b.tag);
    });

  const out: DisplayTag[] = [];
  const used = new Set<string>();
  for (const c of candidates) {
    if (out.length >= max) break;
    if (!c.group) continue;
    if (used.has(c.group)) continue;
    used.add(c.group);
    out.push(c);
  }

  if (out.length > 0) return out;

  // 兜底：如果没有行为标签，返回 image 作为“行为倾向”提示
  const fallback = tags
    .map(getDisplayTag)
    .find((t): t is DisplayTag => Boolean(t) && t.kind === "archetype");
  return fallback ? [fallback] : [];
}

export function getStageDisplay(stage: string | null | undefined): {
  stageId: string;
  labelCn: string;
  explanationCn: string;
} {
  if (stage === "pre") {
    return { stageId: "pre", labelCn: "陪跑阶段：解释", explanationCn: "先对齐规则与目标，建立推进节奏" };
  }
  if (stage === "mid") {
    return { stageId: "mid", labelCn: "陪跑阶段：反思", explanationCn: "围绕分歧点做复盘，收敛下一步" };
  }
  if (stage === "post") {
    return { stageId: "post", labelCn: "陪跑阶段：执行", explanationCn: "把行动拆到下一步，形成跟进节奏" };
  }
  return { stageId: stage || "-", labelCn: "陪跑阶段：未判定", explanationCn: "暂未形成阶段信号" };
}

