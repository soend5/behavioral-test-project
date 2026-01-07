/**
 * 评分工具函数（v1 内容资产版）
 *
 * 支持：
 * - fast：主画像投票 + 稳定度（high/medium/low）+ phase:fast_completed
 * - pro：六维分数（A-F）+ stage(pre/mid/post) + phase:pro_completed
 *
 * 说明：
 * - option.scorePayloadJson 存储的是 data/seed/*.json 中的 score_payload（JSON 字符串）
 * - 这里只做结构级评分，不追求“学术测评”；重点是稳定、可解释、可用于 SOP tags
 */

import { z } from "zod";

const ARCHETYPE_KEYS = [
  "rule_executor",
  "emotion_driven",
  "experience_reliant",
  "opportunity_seeker",
  "defensive_observer",
  "impulsive_reactor",
] as const;

type ArchetypeKey = (typeof ARCHETYPE_KEYS)[number];
const ArchetypeKeySchema = z.enum(ARCHETYPE_KEYS);

const DIMENSION_KEYS = [
  "rule_dependence",
  "emotion_involvement",
  "experience_reliance",
  "opportunity_sensitivity",
  "risk_defense",
  "action_consistency",
] as const;

type DimensionKey = (typeof DIMENSION_KEYS)[number];
const DimensionKeySchema = z.enum(DIMENSION_KEYS);

const DimensionDeltaSchema = z.object({
  rule_dependence: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  emotion_involvement: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  experience_reliance: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  opportunity_sensitivity: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  risk_defense: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  action_consistency: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

const ScorePayloadSchema = z.object({
  archetype_vote: ArchetypeKeySchema,
  dimension_delta: DimensionDeltaSchema,
  tags: z.array(z.string()),
});
type ScorePayload = z.infer<typeof ScorePayloadSchema>;

type ScoreOutput = {
  scoresJson: string;
  tagsJson: string;
  stage: string;
  resultSummaryJson: string;
};

function isImageTag(tag: string): boolean {
  return tag.startsWith("image:");
}

function initDimensionRecord<T>(value: T): Record<DimensionKey, T> {
  return {
    rule_dependence: value,
    emotion_involvement: value,
    experience_reliance: value,
    opportunity_sensitivity: value,
    risk_defense: value,
    action_consistency: value,
  };
}

function initArchetypeVoteRecord(): Record<ArchetypeKey, number> {
  return {
    rule_executor: 0,
    emotion_driven: 0,
    experience_reliant: 0,
    opportunity_seeker: 0,
    defensive_observer: 0,
    impulsive_reactor: 0,
  };
}

function pickPrimaryArchetype(votes: Record<ArchetypeKey, number>): ArchetypeKey {
  let best: ArchetypeKey = ARCHETYPE_KEYS[0];
  for (const key of ARCHETYPE_KEYS) {
    if (votes[key] > votes[best]) best = key;
  }
  return best;
}

function calcFastStability(topVoteCount: number): "high" | "medium" | "low" {
  if (topVoteCount >= 5) return "high";
  if (topVoteCount >= 3) return "medium";
  return "low";
}

function normalizeDimensionScore(raw: number, maxRaw: number): number {
  if (maxRaw <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((raw / maxRaw) * 100)));
}

function decideProStage(scores: Record<DimensionKey, number>): "pre" | "mid" | "post" {
  // 用结构阈值做粗分（0-100），不追求学术精度
  const ruleHigh = scores.rule_dependence >= 60;
  const riskHigh = scores.risk_defense >= 60;
  const actionLow = scores.action_consistency <= 45;

  const actionHigh = scores.action_consistency >= 60;
  const emotionLow = scores.emotion_involvement <= 45;

  if (ruleHigh && riskHigh && actionLow) return "pre";
  if (actionHigh && emotionLow) return "post";
  return "mid";
}

function buildTags(input: {
  version: "fast" | "pro";
  primaryArchetype: ArchetypeKey;
  stability?: "high" | "medium" | "low";
  optionTags: string[];
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  // 固定收敛：只保留一个 image:*
  push(`image:${input.primaryArchetype}`);

  if (input.version === "fast") {
    push(`stability:${input.stability ?? "low"}`);
    push("phase:fast_completed");
  } else {
    push("phase:pro_completed");
  }

  // 追加 option tags（去掉多余 image 标签，避免污染 SOP 匹配）
  for (const tag of input.optionTags) {
    if (isImageTag(tag)) continue;
    push(tag);
  }

  return out;
}

function parseScorePayloadJson(scorePayloadJson: string | null): ScorePayload | null {
  if (!scorePayloadJson) return null;
  try {
    const parsed: unknown = JSON.parse(scorePayloadJson);
    const validated = ScorePayloadSchema.safeParse(parsed);
    if (!validated.success) return null;
    return validated.data;
  } catch {
    return null;
  }
}

/**
 * 计算测评分数与标签（attempt.submit 专用）
 * @param answers 答案映射 { questionId: optionId }
 * @param options 选项列表（包含 scorePayloadJson）
 * @param version 测评版本 'fast' | 'pro'
 */
export async function calculateScores(
  answers: Record<string, string>,
  options: Array<{ id: string; scorePayloadJson: string | null }>,
  version: "fast" | "pro" = "fast"
): Promise<ScoreOutput> {
  const payloadByOptionId = new Map<string, ScorePayload>();
  for (const opt of options) {
    const payload = parseScorePayloadJson(opt.scorePayloadJson);
    if (payload) payloadByOptionId.set(opt.id, payload);
  }

  const votes = initArchetypeVoteRecord();
  const dimensionRaw = initDimensionRecord(0);
  const collectedTags: string[] = [];
  let scoredAnswerCount = 0;

  for (const optionId of Object.values(answers)) {
    const payload = payloadByOptionId.get(optionId);
    if (!payload) continue;

    scoredAnswerCount += 1;
    votes[payload.archetype_vote] += 1;
    for (const key of DIMENSION_KEYS) {
      dimensionRaw[key] += payload.dimension_delta[key];
    }
    collectedTags.push(...payload.tags);
  }

  const primaryArchetype = pickPrimaryArchetype(votes);
  const topVoteCount = votes[primaryArchetype];

  if (version === "fast") {
    const stability = calcFastStability(topVoteCount);
    const tags = buildTags({
      version,
      primaryArchetype,
      stability,
      optionTags: collectedTags,
    });

    const scoresJson = JSON.stringify({
      version,
      archetypeVotes: votes,
      dimensionRaw,
    });

    const resultSummaryJson = JSON.stringify({
      version,
      primaryArchetype,
      stability,
      archetypeVotes: votes,
      dimensionRaw,
    });

    return {
      scoresJson,
      tagsJson: JSON.stringify(tags),
      stage: "pre",
      resultSummaryJson,
    };
  }

  // pro
  const maxPerDimension = Math.max(1, scoredAnswerCount * 2);
  const dimensionScores = initDimensionRecord(0);
  for (const key of DIMENSION_KEYS) {
    dimensionScores[key] = normalizeDimensionScore(dimensionRaw[key], maxPerDimension);
  }

  const stage = decideProStage(dimensionScores);
  const tags = buildTags({
    version,
    primaryArchetype,
    optionTags: collectedTags,
  });

  const scoresJson = JSON.stringify({
    version,
    dimensions: dimensionScores,
    dimensionsRaw: dimensionRaw,
    maxPerDimension,
  });

  const resultSummaryJson = JSON.stringify({
    version,
    primaryArchetype,
    stage,
    archetypeVotes: votes,
    dimensions: dimensionScores,
    dimensionsRaw: dimensionRaw,
    maxPerDimension,
  });

  return {
    scoresJson,
    tagsJson: JSON.stringify(tags),
    stage,
    resultSummaryJson,
  };
}

