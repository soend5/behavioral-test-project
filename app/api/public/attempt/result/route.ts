/**
 * GET /api/public/attempt/result
 * 
 * 使用的门禁函数：
 * - requireInviteByToken (允许 completed，因为这是查看结果)
 * 
 * 校验点：
 * ✅ Token 校验：hash(token) == invites.token_hash
 * ✅ Ownership：只返回该 invite 的 attempt 结果
 * 
 * V1.3 增强：
 * - 返回原型详情 (archetype)
 * - 返回行为维度 (dimensions)
 * - 返回助教信息 (coach: name, wechatQrcode)
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInviteByToken } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { safeJsonParse, safeJsonParseWithSchema } from "@/lib/json";
import { z } from "zod";

const StringArraySchema = z.array(z.string());

// 行为维度 key 列表
const DIMENSION_KEYS = ["rule", "risk", "emotion", "consistency", "opportunity", "experience"] as const;
type DimensionKey = typeof DIMENSION_KEYS[number];
type DimensionLevel = "high" | "medium" | "low";

export const dynamic = "force-dynamic";

/**
 * 从 tags 中提取原型 key
 * 格式: image:rule_executor
 */
function extractArchetypeKey(tags: string[]): string | null {
  for (const tag of tags) {
    if (tag.startsWith("image:")) {
      return tag.slice("image:".length);
    }
  }
  return null;
}

/**
 * 从 tags 中提取行为维度
 * 格式: rule:high, emotion:medium, etc.
 */
function extractDimensions(tags: string[]): Record<DimensionKey, DimensionLevel | null> {
  const result: Record<DimensionKey, DimensionLevel | null> = {
    rule: null,
    risk: null,
    emotion: null,
    consistency: null,
    opportunity: null,
    experience: null,
  };

  for (const tag of tags) {
    const idx = tag.indexOf(":");
    if (idx <= 0) continue;
    const prefix = tag.slice(0, idx) as DimensionKey;
    const value = tag.slice(idx + 1);
    if (DIMENSION_KEYS.includes(prefix) && ["high", "medium", "low"].includes(value)) {
      result[prefix] = value as DimensionLevel;
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return fail(ErrorCode.BAD_REQUEST, "缺少 token 参数");
    }

    // 使用门禁函数：token → invite 校验（允许 completed，因为这是查看结果）
    const invite = await requireInviteByToken(prisma, token, {
      allowStatuses: ["active", "entered", "completed", "expired"],
      includeRelations: false,
    });

    // 查找已提交的 attempt
    const attempt = await prisma.attempt.findFirst({
      where: {
        inviteId: invite.id,
        submittedAt: { not: null },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    if (!attempt) {
      return fail(ErrorCode.NOT_FOUND, "测评结果不存在或未提交");
    }

    // 解析结果数据
    const tags = safeJsonParseWithSchema(attempt.tagsJson, StringArraySchema, []);
    const resultSummary = attempt.resultSummaryJson
      ? safeJsonParse(attempt.resultSummaryJson)
      : null;

    // V1.3: 提取原型 key 并查询详情
    const archetypeKey = extractArchetypeKey(tags);
    let archetypeData: {
      key: string;
      titleCn: string;
      oneLinerCn: string;
      traitsCn: string[];
    } | null = null;

    if (archetypeKey) {
      const archetype = await prisma.archetype.findFirst({
        where: {
          key: archetypeKey,
          status: "active",
        },
        orderBy: {
          version: "desc",
        },
      });

      if (archetype) {
        // traitsCn 字段存储了 traits_cn 数据（行为特征描述）
        // 用于展示用户的行为特点
        const traitsCn = archetype.traitsCn as string[] | null;
        archetypeData = {
          key: archetype.key,
          titleCn: archetype.titleCn,
          oneLinerCn: archetype.oneLinerCn,
          traitsCn: Array.isArray(traitsCn) ? traitsCn.slice(0, 3) : [],
        };
      }
    }

    // V1.3: 提取行为维度
    const dimensions = extractDimensions(tags);

    // V1.3: 获取助教信息
    const coach = await prisma.user.findUnique({
      where: { id: invite.coachId },
      select: {
        id: true,
        username: true,
        name: true,
        wechatQrcode: true,
      },
    });

    return ok({
      attempt: {
        id: attempt.id,
        version: attempt.version,
        submittedAt: attempt.submittedAt?.toISOString(),
        tags,
        stage: attempt.stage,
        resultSummary,
      },
      // V1.3 新增字段
      archetype: archetypeData,
      dimensions,
      coach: coach
        ? {
            id: coach.id,
            username: coach.username,
            name: coach.name,
            wechatQrcode: coach.wechatQrcode,
          }
        : null,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.INVITE_INVALID ||
      error.message === ErrorCode.INVITE_EXPIRED_OR_COMPLETED ||
      error.message === ErrorCode.BAD_REQUEST
    ) {
      const messageMap: Record<string, string> = {
        [ErrorCode.INVITE_INVALID]: "邀请 token 无效或不存在",
        [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: "邀请已过期或已完成",
        [ErrorCode.BAD_REQUEST]: "缺少 token 参数",
      };
      return fail(error.message, messageMap[error.message] || error.message);
    }
    console.error("Get result error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
