/**
 * v1.8: 复测对比 API
 * GET - 获取当前测评与上次测评的对比
 * 
 * 无需登录，通过 token 验证
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { hashToken } from "@/lib/token";

// 维度 key 列表
const DIMENSION_KEYS = ["rule", "risk", "emotion", "consistency"] as const;

type DimensionScores = Record<string, number>;

interface AttemptComparison {
  archetype: string | null;
  stage: string | null;
  dimensions: DimensionScores;
  date: string;
}

interface Change {
  type: "archetype" | "stage" | "dimension";
  dimension?: string;
  from: string | number | null;
  to: string | number | null;
  diff?: number;
  significance: "high" | "medium" | "low";
}

function parseDimensions(scoresJson: string | null): DimensionScores {
  if (!scoresJson) return {};
  try {
    const scores = JSON.parse(scoresJson);
    const result: DimensionScores = {};
    for (const key of DIMENSION_KEYS) {
      if (typeof scores[key] === "number") {
        result[key] = scores[key];
      }
    }
    return result;
  } catch {
    return {};
  }
}

function parseArchetype(tagsJson: string | null): string | null {
  if (!tagsJson) return null;
  try {
    const tags = JSON.parse(tagsJson) as string[];
    // 画像标签格式: archetype:xxx
    const archetypeTag = tags.find((t) => t.startsWith("archetype:"));
    return archetypeTag ? archetypeTag.replace("archetype:", "") : null;
  } catch {
    return null;
  }
}

function calculateChanges(
  current: AttemptComparison,
  previous: AttemptComparison
): Change[] {
  const changes: Change[] = [];

  // 画像变化
  if (current.archetype !== previous.archetype) {
    changes.push({
      type: "archetype",
      from: previous.archetype,
      to: current.archetype,
      significance: "high",
    });
  }

  // 阶段变化
  if (current.stage !== previous.stage) {
    changes.push({
      type: "stage",
      from: previous.stage,
      to: current.stage,
      significance: "high",
    });
  }

  // 维度变化（变化 >= 10 分的）
  for (const dim of DIMENSION_KEYS) {
    const currentScore = current.dimensions[dim];
    const previousScore = previous.dimensions[dim];

    if (
      typeof currentScore === "number" &&
      typeof previousScore === "number"
    ) {
      const diff = currentScore - previousScore;
      if (Math.abs(diff) >= 10) {
        changes.push({
          type: "dimension",
          dimension: dim,
          from: previousScore,
          to: currentScore,
          diff,
          significance: Math.abs(diff) >= 20 ? "high" : "medium",
        });
      }
    }
  }

  return changes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 token 参数", 400);
    }

    // 验证 token 并获取当前测评
    const tokenHash = hashToken(token);
    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
      include: {
        attempts: {
          where: { submittedAt: { not: null } },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!invite) {
      return fail(ErrorCode.NOT_FOUND, "邀请不存在", 404);
    }

    const currentAttempt = invite.attempts[0];
    if (!currentAttempt) {
      return fail(ErrorCode.NOT_FOUND, "未找到已完成的测评", 404);
    }

    // 获取上一次测评（同一客户，不同邀请，已提交）
    const previousAttempt = await prisma.attempt.findFirst({
      where: {
        customerId: invite.customerId,
        submittedAt: { not: null },
        id: { not: currentAttempt.id },
      },
      orderBy: { submittedAt: "desc" },
    });

    if (!previousAttempt) {
      return ok({
        hasComparison: false,
        message: "这是首次测评，完成训练后可以复测查看变化",
      });
    }

    // 构建对比数据
    const current: AttemptComparison = {
      archetype: parseArchetype(currentAttempt.tagsJson),
      stage: currentAttempt.stage,
      dimensions: parseDimensions(currentAttempt.scoresJson),
      date: currentAttempt.submittedAt!.toISOString(),
    };

    const previous: AttemptComparison = {
      archetype: parseArchetype(previousAttempt.tagsJson),
      stage: previousAttempt.stage,
      dimensions: parseDimensions(previousAttempt.scoresJson),
      date: previousAttempt.submittedAt!.toISOString(),
    };

    // 计算变化
    const changes = calculateChanges(current, previous);

    // 计算间隔天数
    const daysBetween = Math.floor(
      (new Date(current.date).getTime() -
        new Date(previous.date).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return ok({
      hasComparison: true,
      current,
      previous,
      changes,
      daysBetween,
      summary: {
        hasSignificantChanges: changes.some((c) => c.significance === "high"),
        totalChanges: changes.length,
        improvementAreas: changes
          .filter(
            (c) =>
              c.type === "dimension" &&
              typeof c.diff === "number" &&
              c.diff > 0
          )
          .map((c) => c.dimension),
        declineAreas: changes
          .filter(
            (c) =>
              c.type === "dimension" &&
              typeof c.diff === "number" &&
              c.diff < 0
          )
          .map((c) => c.dimension),
      },
    });
  } catch (e: unknown) {
    console.error("GET /api/public/attempt/compare error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
