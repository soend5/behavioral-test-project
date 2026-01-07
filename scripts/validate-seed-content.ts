import { readFile } from "node:fs/promises";
import path from "node:path";

type ArchetypeKey =
  | "rule_executor"
  | "emotion_driven"
  | "experience_reliant"
  | "opportunity_seeker"
  | "defensive_observer"
  | "impulsive_reactor";

type DimensionKey =
  | "rule_dependence"
  | "emotion_involvement"
  | "experience_reliance"
  | "opportunity_sensitivity"
  | "risk_defense"
  | "action_consistency";

const ARCHETYPE_KEYS: ArchetypeKey[] = [
  "rule_executor",
  "emotion_driven",
  "experience_reliant",
  "opportunity_seeker",
  "defensive_observer",
  "impulsive_reactor",
];

const DIMENSION_KEYS: DimensionKey[] = [
  "rule_dependence",
  "emotion_involvement",
  "experience_reliance",
  "opportunity_sensitivity",
  "risk_defense",
  "action_consistency",
];

type ScorePayload = {
  archetype_vote: ArchetypeKey;
  dimension_delta: Record<DimensionKey, 0 | 1 | 2>;
  tags: string[];
};

type QuizOptionSeed = {
  id: "A" | "B" | "C" | "D";
  text_cn: string;
  score_payload: ScorePayload;
};

type QuizQuestionSeed = {
  id: string;
  prompt_cn: string;
  options: QuizOptionSeed[];
};

type QuizFastSeed = {
  slug: string;
  version: string;
  title_cn: string;
  questions: QuizQuestionSeed[];
};

type QuizProSeed = {
  slug: string;
  version: string;
  title_cn: string;
  dimensions: Array<{
    key: DimensionKey;
    title_cn: string;
    questions: QuizQuestionSeed[];
  }>;
};

type ArchetypesSeed = {
  version: string;
  status: string;
  items: Array<{
    key: ArchetypeKey;
    title_cn: string;
    one_liner_cn: string;
    traits_cn: string[];
    risks_cn: string[];
    coach_guidance_cn: string[];
  }>;
};

type TrainingHandbookSeed = {
  version: string;
  status: string;
  days: Array<{
    day: number;
    title_cn: string;
    goal_cn: string;
    sections: Array<{ title_cn: string; bullets_cn: string[] }>;
    do_dont_cn: { do: string[]; dont: string[] };
  }>;
};

type MethodologySeed = {
  version: string;
  status: string;
  sections: Array<{
    slug: string;
    title_cn: string;
    content_markdown: string;
  }>;
};

function fatal(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fatal(message);
}

async function readSeedJson<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", "seed", filename);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function assertUnique<T>(items: T[], keyOf: (item: T) => string, label: string) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyOf(item);
    assert(!seen.has(key), `${label} duplicate: ${key}`);
    seen.add(key);
  }
}

function isAllowedScoreTag(tag: string): boolean {
  for (const archetype of ARCHETYPE_KEYS) {
    if (tag === `image:${archetype}`) return true;
  }
  return (
    tag === "risk:high" ||
    tag === "risk:medium" ||
    tag === "risk:low" ||
    tag === "emotion:high" ||
    tag === "emotion:medium" ||
    tag === "emotion:low" ||
    tag === "consistency:high" ||
    tag === "consistency:medium" ||
    tag === "consistency:low" ||
    tag === "rule:high" ||
    tag === "rule:medium" ||
    tag === "rule:low" ||
    tag === "opportunity:high" ||
    tag === "opportunity:medium" ||
    tag === "opportunity:low" ||
    tag === "experience:high" ||
    tag === "experience:medium" ||
    tag === "experience:low"
  );
}

function hasAtLeastOneBehaviorTag(tags: string[]): boolean {
  return tags.some(
    (t) =>
      t.startsWith("risk:") ||
      t.startsWith("emotion:") ||
      t.startsWith("consistency:") ||
      t.startsWith("rule:") ||
      t.startsWith("opportunity:") ||
      t.startsWith("experience:")
  );
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(rng: () => number, arr: T[]): T {
  assert(arr.length > 0, "pickRandom: empty array");
  const idx = Math.floor(rng() * arr.length);
  return arr[Math.min(idx, arr.length - 1)];
}

function computePrimaryArchetype(votes: Record<ArchetypeKey, number>): ArchetypeKey {
  let best: ArchetypeKey = ARCHETYPE_KEYS[0];
  for (const k of ARCHETYPE_KEYS) {
    if (votes[k] > votes[best]) best = k;
  }
  return best;
}

function computeFastStability(topVoteCount: number): "high" | "medium" | "low" {
  if (topVoteCount >= 5) return "high";
  if (topVoteCount >= 3) return "medium";
  return "low";
}

function computeDimensionTotals(payloads: ScorePayload[]): Record<DimensionKey, number> {
  const totals: Record<DimensionKey, number> = {
    rule_dependence: 0,
    emotion_involvement: 0,
    experience_reliance: 0,
    opportunity_sensitivity: 0,
    risk_defense: 0,
    action_consistency: 0,
  };
  for (const p of payloads) {
    for (const k of DIMENSION_KEYS) totals[k] += p.dimension_delta[k];
  }
  return totals;
}

function normalizeDimension(raw: number, maxRaw: number): number {
  if (maxRaw <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((raw / maxRaw) * 100)));
}

function mainSummaryLine(label: string, ok: boolean) {
  const prefix = ok ? "OK " : "FAIL ";
  console.log(`${prefix}${label}`);
}

async function main() {
  const fast = await readSeedJson<QuizFastSeed>("quiz_fast_v1.json");
  const pro = await readSeedJson<QuizProSeed>("quiz_pro_v1.json");
  const archetypes = await readSeedJson<ArchetypesSeed>("archetypes_v1.json");
  const training = await readSeedJson<TrainingHandbookSeed>("training_handbook_v1.json");
  const methodology = await readSeedJson<MethodologySeed>("methodology_v1.json");

  // --- Fast checks ---
  assert(Array.isArray(fast.questions), "fast.questions must be an array");
  assert(fast.questions.length === 9, `fast question count must be 9, got ${fast.questions.length}`);
  assertUnique(fast.questions, (q) => q.id, "fast.question.id");

  for (const q of fast.questions) {
    assert(q.id && typeof q.id === "string", "fast.question.id must be string");
    assert(q.prompt_cn && typeof q.prompt_cn === "string", "fast.question.prompt_cn must be string");
    assert(Array.isArray(q.options), "fast.question.options must be array");
    assert(q.options.length === 4, `fast.question.options must be 4 (${q.id})`);
    assertUnique(q.options, (o) => o.id, `fast.option.id (${q.id})`);

    for (const opt of q.options) {
      assert(opt.text_cn && typeof opt.text_cn === "string", `fast.option.text_cn must be string (${q.id}/${opt.id})`);
      const p = opt.score_payload;
      assert(ARCHETYPE_KEYS.includes(p.archetype_vote), `fast.archetype_vote invalid (${q.id}/${opt.id})`);
      assert(typeof p.dimension_delta === "object" && p.dimension_delta !== null, `fast.dimension_delta missing (${q.id}/${opt.id})`);
      for (const k of DIMENSION_KEYS) {
        const v = p.dimension_delta[k];
        assert(v === 0 || v === 1 || v === 2, `fast.dimension_delta.${k} invalid (${q.id}/${opt.id})`);
      }
      assert(Array.isArray(p.tags), `fast.tags must be array (${q.id}/${opt.id})`);
      assert(p.tags.some((t) => t.startsWith("image:")), `fast.tags must include image:* (${q.id}/${opt.id})`);
      for (const t of p.tags) {
        assert(isAllowedScoreTag(t), `fast.tags contains disallowed tag "${t}" (${q.id}/${opt.id})`);
      }
    }
  }
  mainSummaryLine("Fast: 9 questions × 4 options, tags/deltas valid", true);

  // --- Pro checks ---
  assert(Array.isArray(pro.dimensions), "pro.dimensions must be an array");
  assert(pro.dimensions.length === 6, `pro.dimensions must be 6, got ${pro.dimensions.length}`);
  assertUnique(pro.dimensions, (d) => d.key, "pro.dimension.key");

  const proQuestionAll: QuizQuestionSeed[] = [];
  for (const dim of pro.dimensions) {
    assert(DIMENSION_KEYS.includes(dim.key), `pro.dimension.key invalid: ${dim.key}`);
    assert(Array.isArray(dim.questions), `pro.dimension.questions must be array (${dim.key})`);
    assert(dim.questions.length === 3, `pro.${dim.key} question count must be 3, got ${dim.questions.length}`);

    for (const q of dim.questions) {
      proQuestionAll.push(q);
      assert(q.id && typeof q.id === "string", `pro.question.id must be string (${dim.key})`);
      assert(q.prompt_cn && typeof q.prompt_cn === "string", `pro.question.prompt_cn must be string (${q.id})`);
      assert(Array.isArray(q.options), `pro.question.options must be array (${q.id})`);
      assert(q.options.length === 4, `pro.question.options must be 4 (${q.id})`);
      assertUnique(q.options, (o) => o.id, `pro.option.id (${q.id})`);

      // 每题至少有一个选项对该维度有 1 或 2（不是全 0）
      const hasNonZero = q.options.some((o) => o.score_payload.dimension_delta[dim.key] > 0);
      assert(hasNonZero, `pro.${dim.key}.${q.id}: dimension_delta[${dim.key}] must have at least one > 0`);

      for (const opt of q.options) {
        assert(opt.text_cn && typeof opt.text_cn === "string", `pro.option.text_cn must be string (${q.id}/${opt.id})`);
        const p = opt.score_payload;
        assert(ARCHETYPE_KEYS.includes(p.archetype_vote), `pro.archetype_vote invalid (${q.id}/${opt.id})`);
        for (const k of DIMENSION_KEYS) {
          const v = p.dimension_delta[k];
          assert(v === 0 || v === 1 || v === 2, `pro.dimension_delta.${k} invalid (${q.id}/${opt.id})`);
        }
        assert(Array.isArray(p.tags), `pro.tags must be array (${q.id}/${opt.id})`);
        assert(p.tags.some((t) => t.startsWith("image:")), `pro.tags must include image:* (${q.id}/${opt.id})`);
        assert(
          hasAtLeastOneBehaviorTag(p.tags),
          `pro.tags must include at least one behavior tag (${q.id}/${opt.id})`
        );
        for (const t of p.tags) {
          assert(isAllowedScoreTag(t), `pro.tags contains disallowed tag "${t}" (${q.id}/${opt.id})`);
        }
      }
    }
  }

  assert(proQuestionAll.length === 18, `pro total questions must be 18, got ${proQuestionAll.length}`);
  assertUnique(proQuestionAll, (q) => q.id, "pro.question.id");
  mainSummaryLine("Pro: 18 questions (6 dims × 3), each 4 options, tags/deltas valid", true);

  // --- Archetypes checks ---
  assert(Array.isArray(archetypes.items), "archetypes.items must be array");
  assert(archetypes.items.length === 6, `archetypes count must be 6, got ${archetypes.items.length}`);
  assertUnique(archetypes.items, (a) => a.key, "archetypes.key");
  for (const key of ARCHETYPE_KEYS) {
    assert(archetypes.items.some((i) => i.key === key), `archetypes missing key: ${key}`);
  }
  mainSummaryLine("Archetypes: 6 keys complete", true);

  // --- Training & Methodology sanity checks ---
  assert(Array.isArray(training.days), "training.days must be array");
  assert(training.days.length === 7, `training must have 7 days, got ${training.days.length}`);
  assert(Array.isArray(methodology.sections), "methodology.sections must be array");
  assert(methodology.sections.length > 0, "methodology.sections must not be empty");
  mainSummaryLine("Training handbook: 7 days; Methodology: non-empty", true);

  // --- Random sampling ---
  const rng = mulberry32(260106);
  const runs = 20;

  const fastPrimaryDist: Record<ArchetypeKey, number> = {
    rule_executor: 0,
    emotion_driven: 0,
    experience_reliant: 0,
    opportunity_seeker: 0,
    defensive_observer: 0,
    impulsive_reactor: 0,
  };
  const fastStabilityDist: Record<"high" | "medium" | "low", number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (let i = 0; i < runs; i += 1) {
    const payloads = fast.questions.map((q) => pickRandom(rng, q.options).score_payload);
    const votes: Record<ArchetypeKey, number> = {
      rule_executor: 0,
      emotion_driven: 0,
      experience_reliant: 0,
      opportunity_seeker: 0,
      defensive_observer: 0,
      impulsive_reactor: 0,
    };
    for (const p of payloads) votes[p.archetype_vote] += 1;
    const primary = computePrimaryArchetype(votes);
    fastPrimaryDist[primary] += 1;
    fastStabilityDist[computeFastStability(votes[primary])] += 1;
  }

  const fastPrimaryDistinct = Object.values(fastPrimaryDist).filter((n) => n > 0).length;
  assert(
    fastPrimaryDistinct >= 2,
    `fast random sampling too extreme: only ${fastPrimaryDistinct} archetype(s) appeared`
  );

  console.log("\nRandom sampling (seed=260106, runs=20)");
  console.log("- Fast primary archetype distribution:", fastPrimaryDist);
  console.log("- Fast stability distribution:", fastStabilityDist);

  const proPrimaryDist: Record<ArchetypeKey, number> = {
    rule_executor: 0,
    emotion_driven: 0,
    experience_reliant: 0,
    opportunity_seeker: 0,
    defensive_observer: 0,
    impulsive_reactor: 0,
  };

  const dimensionMin: Record<DimensionKey, number> = {
    rule_dependence: Number.POSITIVE_INFINITY,
    emotion_involvement: Number.POSITIVE_INFINITY,
    experience_reliance: Number.POSITIVE_INFINITY,
    opportunity_sensitivity: Number.POSITIVE_INFINITY,
    risk_defense: Number.POSITIVE_INFINITY,
    action_consistency: Number.POSITIVE_INFINITY,
  };
  const dimensionMax: Record<DimensionKey, number> = {
    rule_dependence: 0,
    emotion_involvement: 0,
    experience_reliance: 0,
    opportunity_sensitivity: 0,
    risk_defense: 0,
    action_consistency: 0,
  };

  for (let i = 0; i < runs; i += 1) {
    const payloads: ScorePayload[] = [];
    for (const dim of pro.dimensions) {
      for (const q of dim.questions) {
        payloads.push(pickRandom(rng, q.options).score_payload);
      }
    }

    const votes: Record<ArchetypeKey, number> = {
      rule_executor: 0,
      emotion_driven: 0,
      experience_reliant: 0,
      opportunity_seeker: 0,
      defensive_observer: 0,
      impulsive_reactor: 0,
    };
    for (const p of payloads) votes[p.archetype_vote] += 1;
    const primary = computePrimaryArchetype(votes);
    proPrimaryDist[primary] += 1;

    const totals = computeDimensionTotals(payloads);
    const maxPerDimension = Math.max(1, payloads.length * 2);
    const normalized: Record<DimensionKey, number> = {
      rule_dependence: normalizeDimension(totals.rule_dependence, maxPerDimension),
      emotion_involvement: normalizeDimension(totals.emotion_involvement, maxPerDimension),
      experience_reliance: normalizeDimension(totals.experience_reliance, maxPerDimension),
      opportunity_sensitivity: normalizeDimension(totals.opportunity_sensitivity, maxPerDimension),
      risk_defense: normalizeDimension(totals.risk_defense, maxPerDimension),
      action_consistency: normalizeDimension(totals.action_consistency, maxPerDimension),
    };

    const allZero = DIMENSION_KEYS.every((k) => normalized[k] === 0);
    assert(!allZero, "pro random sampling produced all-zero dimension scores (unexpected)");

    for (const k of DIMENSION_KEYS) {
      dimensionMin[k] = Math.min(dimensionMin[k], normalized[k]);
      dimensionMax[k] = Math.max(dimensionMax[k], normalized[k]);
    }
  }

  const proPrimaryDistinct = Object.values(proPrimaryDist).filter((n) => n > 0).length;
  assert(
    proPrimaryDistinct >= 2,
    `pro random sampling too extreme: only ${proPrimaryDistinct} archetype(s) appeared`
  );

  console.log("- Pro primary archetype distribution:", proPrimaryDist);
  console.log("- Pro dimension score ranges (0-100):", {
    rule_dependence: [dimensionMin.rule_dependence, dimensionMax.rule_dependence],
    emotion_involvement: [dimensionMin.emotion_involvement, dimensionMax.emotion_involvement],
    experience_reliance: [dimensionMin.experience_reliance, dimensionMax.experience_reliance],
    opportunity_sensitivity: [
      dimensionMin.opportunity_sensitivity,
      dimensionMax.opportunity_sensitivity,
    ],
    risk_defense: [dimensionMin.risk_defense, dimensionMax.risk_defense],
    action_consistency: [dimensionMin.action_consistency, dimensionMax.action_consistency],
  });

  console.log("\nOK content assets validated.");
}

main().catch((err) => {
  console.error("\nFAIL content assets validation:", err instanceof Error ? err.message : err);
  process.exit(1);
});
