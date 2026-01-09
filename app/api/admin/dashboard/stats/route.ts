/**
 * v1.7: Admin 看板统计 API
 * GET - 获取看板统计数据
 * 
 * 门禁：requireAdmin()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

// 禁用静态渲染
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 并行查询各项统计
    const [
      todayInvites,
      todayAttempts,
      todayCompletedAttempts,
      periodInvites,
      periodAttempts,
      periodCompletedAttempts,
      activeCoaches,
      archetypeDistribution,
      stageDistribution,
      coachStats,
      contactClicks,
    ] = await Promise.all([
      // 今日邀请数
      prisma.invite.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // 今日测评开始数
      prisma.attempt.count({
        where: { startedAt: { gte: todayStart } },
      }),
      // 今日测评完成数
      prisma.attempt.count({
        where: { submittedAt: { gte: todayStart } },
      }),
      // 周期内邀请数
      prisma.invite.count({
        where: { createdAt: { gte: startDate } },
      }),
      // 周期内测评开始数
      prisma.attempt.count({
        where: { startedAt: { gte: startDate } },
      }),
      // 周期内测评完成数
      prisma.attempt.count({
        where: { submittedAt: { gte: startDate } },
      }),
      // 活跃助教数（7天内有操作）
      prisma.user.count({
        where: {
          role: "coach",
          status: "active",
          OR: [
            { invites: { some: { createdAt: { gte: startDate } } } },
            { customers: { some: { createdAt: { gte: startDate } } } },
          ],
        },
      }),
      // 画像分布
      prisma.attempt.groupBy({
        by: ["resultSummaryJson"],
        where: {
          submittedAt: { not: null },
          resultSummaryJson: { not: null },
        },
        _count: true,
      }),
      // 阶段分布
      prisma.attempt.groupBy({
        by: ["stage"],
        where: {
          submittedAt: { not: null },
          stage: { not: null },
        },
        _count: true,
      }),
      // 助教统计
      prisma.user.findMany({
        where: { role: "coach", status: "active" },
        select: {
          id: true,
          name: true,
          username: true,
          _count: {
            select: {
              customers: true,
              attempts: { where: { submittedAt: { not: null } } },
            },
          },
        },
      }),
      // 联系点击数（从埋点）
      prisma.trackingEvent.count({
        where: {
          event: "result_contact_click",
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // 计算完成率
    const completionRate = periodAttempts > 0
      ? Math.round((periodCompletedAttempts / periodAttempts) * 100)
      : 0;

    // 计算联系率
    const contactRate = periodCompletedAttempts > 0
      ? Math.round((contactClicks / periodCompletedAttempts) * 100)
      : 0;

    // 处理画像分布
    const archetypeCounts: Record<string, number> = {};
    for (const item of archetypeDistribution) {
      if (item.resultSummaryJson) {
        try {
          const summary = JSON.parse(item.resultSummaryJson);
          const archetype = summary.archetype || "unknown";
          archetypeCounts[archetype] = (archetypeCounts[archetype] || 0) + item._count;
        } catch {}
      }
    }

    // 处理阶段分布
    const stageCounts: Record<string, number> = {};
    for (const item of stageDistribution) {
      if (item.stage) {
        stageCounts[item.stage] = item._count;
      }
    }

    // 获取助教跟进和话术使用统计
    const coachFollowUpCounts = await prisma.followUpLog.groupBy({
      by: ["coachId"],
      _count: true,
    });
    const coachScriptUsageCounts = await prisma.scriptUsageLog.groupBy({
      by: ["coachId"],
      _count: true,
    });

    const followUpMap = new Map(coachFollowUpCounts.map((c) => [c.coachId, c._count]));
    const scriptUsageMap = new Map(coachScriptUsageCounts.map((c) => [c.coachId, c._count]));

    // 组装助教排行
    const coachRanking = coachStats
      .map((coach) => ({
        id: coach.id,
        name: coach.name || coach.username,
        customerCount: coach._count.customers,
        completedAttempts: coach._count.attempts,
        followUpCount: followUpMap.get(coach.id) || 0,
        scriptUsageCount: scriptUsageMap.get(coach.id) || 0,
      }))
      .sort((a, b) => b.completedAttempts - a.completedAttempts);

    // 构建漏斗数据
    const funnel = [
      { stage: "邀请发送", count: periodInvites, rate: 100 },
      {
        stage: "开始测评",
        count: periodAttempts,
        rate: periodInvites > 0 ? Math.round((periodAttempts / periodInvites) * 100) : 0,
      },
      {
        stage: "完成测评",
        count: periodCompletedAttempts,
        rate: periodInvites > 0 ? Math.round((periodCompletedAttempts / periodInvites) * 100) : 0,
      },
      {
        stage: "联系助教",
        count: contactClicks,
        rate: periodInvites > 0 ? Math.round((contactClicks / periodInvites) * 100) : 0,
      },
    ];

    return ok({
      period: { days, startDate: startDate.toISOString() },
      today: {
        invites: todayInvites,
        attempts: todayAttempts,
        completedAttempts: todayCompletedAttempts,
      },
      summary: {
        totalInvites: periodInvites,
        totalAttempts: periodAttempts,
        completedAttempts: periodCompletedAttempts,
        completionRate,
        contactClicks,
        contactRate,
        activeCoaches,
      },
      funnel,
      archetypeDistribution: Object.entries(archetypeCounts).map(([key, count]) => ({
        archetype: key,
        count,
      })),
      stageDistribution: Object.entries(stageCounts).map(([key, count]) => ({
        stage: key,
        count,
      })),
      coachRanking,
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("GET /api/admin/dashboard/stats error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
