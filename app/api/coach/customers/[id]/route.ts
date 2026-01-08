/**
 * GET /api/coach/customers/:id - 获取客户详情
 * PATCH /api/coach/customers/:id - 更新客户
 * 
 * GET 使用的门禁函数：
 * - requireCoachOwnsCustomer() (验证 ownership)
 * 
 * PATCH 使用的门禁函数：
 * - requireCoachOwnsCustomer() (验证 ownership)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ coach 只能访问自己的客户
 * ✅ 聚合输出：customer + latest_attempt + attempt_timeline + coach_tags + realtime_panel
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachOwnsCustomer } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { matchSOP, getDefaultRealtimePanel } from "@/lib/sop-matcher";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { safeJsonParse, safeJsonParseWithSchema } from "@/lib/json";
import { getCoachNoteText, parseCoachMetadata, serializeCoachMetadata } from "@/lib/coach-stage";
import { z } from "zod";

const StringArraySchema = z.array(z.string());
const AnswersRecordSchema = z.record(z.string().min(1), z.string().min(1));

const ScorePayloadHintSchema = z.object({
  archetype_vote: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});
type ScorePayloadHint = z.infer<typeof ScorePayloadHintSchema>;
const EmptyScorePayloadHint: ScorePayloadHint = {};

function buildAnswerHintTag(scorePayloadJson: string | null | undefined): string | null {
  const payload = safeJsonParseWithSchema(
    scorePayloadJson,
    ScorePayloadHintSchema,
    EmptyScorePayloadHint
  );
  const tags = payload.tags ?? [];
  const candidate =
    tags.find((t) => !t.startsWith("image:") && !t.startsWith("phase:") && !t.startsWith("stability:")) ??
    null;
  if (candidate) return candidate;
  if (payload.archetype_vote) return `image:${payload.archetype_vote}`;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);

    // 获取客户基础信息
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return fail(ErrorCode.CUSTOMER_NOT_FOUND, "客户不存在");
    }

    // 获取最新一次已提交的 attempt
    const latestAttempt = await prisma.attempt.findFirst({
      where: {
        customerId,
        submittedAt: { not: null },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // 获取所有 attempt（时间线）
    const attempts = await prisma.attempt.findMany({
      where: {
        customerId,
        submittedAt: { not: null },
      },
      orderBy: {
        submittedAt: "desc",
      },
      include: {
        invite: {
          select: {
            version: true,
            quizVersion: true,
          },
        },
      },
    });

    // 获取助教标签
    const coachTags = await prisma.coachTag.findMany({
      where: {
        customerId,
        coachId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 构建 latestAttempt 详细信息（答案 + 结果摘要）
    let latestAttemptView: any = null;
    if (latestAttempt) {
      const tags = latestAttempt.tagsJson
        ? safeJsonParseWithSchema(latestAttempt.tagsJson, StringArraySchema, [])
        : [];

      const answersRecord = safeJsonParseWithSchema(
        latestAttempt.answersJson,
        AnswersRecordSchema,
        {}
      );

      const resultSummary = latestAttempt.resultSummaryJson
        ? safeJsonParse(latestAttempt.resultSummaryJson)
        : null;

      let answers: Array<{
        questionId: string;
        orderNo: number | null;
        stem: string | null;
        optionId: string;
        optionText: string | null;
        hintTag: string | null;
      }> = [];

      const answerKeys = Object.keys(answersRecord);
      if (answerKeys.length > 0) {
        const quiz = await prisma.quiz.findUnique({
          where: {
            quizVersion_version: {
              quizVersion: latestAttempt.quizVersion,
              version: latestAttempt.version,
            },
          },
          include: {
            questions: {
              orderBy: { orderNo: "asc" },
              include: {
                options: {
                  orderBy: { orderNo: "asc" },
                },
              },
            },
          },
        });

        const questionById = new Map<
          string,
          {
            orderNo: number;
            stem: string;
            optionTextById: Map<string, string>;
            optionHintTagById: Map<string, string | null>;
          }
        >();

        if (quiz) {
          for (const q of quiz.questions) {
            questionById.set(q.id, {
              orderNo: q.orderNo,
              stem: q.stem,
              optionTextById: new Map(q.options.map((o) => [o.id, o.text])),
              optionHintTagById: new Map(
                q.options.map((o) => [o.id, buildAnswerHintTag(o.scorePayloadJson)])
              ),
            });
          }
        }

        // 按题目顺序输出（已回答的）
        const ordered = quiz?.questions
          .filter((q) => answersRecord[q.id])
          .map((q) => {
            const optionId = answersRecord[q.id];
            const meta = questionById.get(q.id);
            return {
              questionId: q.id,
              orderNo: q.orderNo,
              stem: q.stem,
              optionId,
              optionText: meta?.optionTextById.get(optionId) ?? null,
              hintTag: meta?.optionHintTagById.get(optionId) ?? null,
            };
          });

        answers = ordered ?? [];

        // 兜底：answersRecord 中存在但题库中找不到的题目
        for (const [questionId, optionId] of Object.entries(answersRecord)) {
          if (questionById.has(questionId)) continue;
          answers.push({
            questionId,
            orderNo: null,
            stem: null,
            optionId,
            optionText: null,
            hintTag: null,
          });
        }
      }

      latestAttemptView = {
        id: latestAttempt.id,
        version: latestAttempt.version,
        quizVersion: latestAttempt.quizVersion,
        submittedAt: latestAttempt.submittedAt,
        tags,
        stage: latestAttempt.stage,
        answersRecord,
        answers,
        resultSummary,
      };
    }

    // 构建 realtime_panel
    let realtimePanel: any = null;

    if (latestAttempt) {
      // 有 attempt：基于 stage + tags 匹配 SOP
      const systemTags = latestAttempt.tagsJson
        ? safeJsonParseWithSchema(latestAttempt.tagsJson, StringArraySchema, [])
        : [];
      const coachTagKeys = coachTags.map((t) => t.tagKey);
      const allTags = [...systemTags, ...coachTagKeys];

      const matchedSOP = await matchSOP(
        prisma,
        latestAttempt.stage || "pre",
        allTags
      );

      if (matchedSOP) {
        realtimePanel = {
          stage: matchedSOP.stage,
          stateSummary: matchedSOP.stateSummary,
          coreGoal: matchedSOP.coreGoal,
          strategyList: matchedSOP.strategyList.slice(0, 3), // 最多3条
          forbiddenList: matchedSOP.forbiddenList,
        };
      } else {
        // 如果没有匹配到 SOP，使用默认 panel
        realtimePanel = await getDefaultRealtimePanel(
          prisma,
          latestAttempt.stage || "pre"
        );
      }
    } else {
      // 没有 attempt：返回默认 panel
      realtimePanel = await getDefaultRealtimePanel(prisma, "pre");
    }

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.view_customer",
      "customer",
      customerId,
      null
    );

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        nickname: customer.nickname,
        phone: customer.phone,
        wechat: customer.wechat,
        qq: customer.qq,
        note: getCoachNoteText(customer.note),
        coachId: customer.coachId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      latestAttempt: latestAttemptView,
      attemptTimeline: attempts.map((a) => ({
        id: a.id,
        version: a.version,
        quizVersion: a.quizVersion,
        submittedAt: a.submittedAt,
        tags: safeJsonParseWithSchema(a.tagsJson, StringArraySchema, []),
        stage: a.stage,
      })),
      coachTags: coachTags.map((t) => ({
        id: t.id,
        tagKey: t.tagKey,
        createdAt: t.createdAt,
      })),
      realtimePanel,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND) {
      return fail(error.message, "客户不存在");
    }
    console.error("Get customer error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);
    const body = await request.json();
    const { name, nickname, phone, wechat, qq } = body;

    const hasNote = Object.prototype.hasOwnProperty.call(body, "note");
    const noteInput = hasNote ? (body.note as string | null) : undefined;

    let noteToWrite: string | null | undefined = undefined;
    if (hasNote) {
      const existing = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { note: true },
      });

      if (!existing) {
        return fail(ErrorCode.CUSTOMER_NOT_FOUND, "客户不存在");
      }

      const existingMeta = parseCoachMetadata(existing.note);
      const hasCoachMetadata =
        typeof existingMeta.coach_stage === "string" ||
        typeof existingMeta.coach_stage_updated_at === "string";

      const nextNoteText =
        typeof noteInput === "string" ? noteInput : noteInput === null ? null : null;

      if (hasCoachMetadata) {
        existingMeta.note_text = nextNoteText ?? undefined;
        noteToWrite = serializeCoachMetadata(existingMeta);
      } else {
        noteToWrite = nextNoteText;
      }
    }

    // 更新客户
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name,
        nickname,
        phone,
        wechat,
        qq,
        ...(hasNote ? { note: noteToWrite ?? null } : {}),
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.update_customer",
      "customer",
      customerId,
      {
        updatedFields: Object.keys(body),
      }
    );

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        nickname: customer.nickname,
        note: getCoachNoteText(customer.note),
        updatedAt: customer.updatedAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND) {
      return fail(error.message, "客户不存在");
    }
    console.error("Update customer error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

