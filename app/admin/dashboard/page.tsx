"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminNav } from "../_components/AdminNav";

type DashboardStats = {
  period: { days: number; startDate: string };
  today: {
    invites: number;
    attempts: number;
    completedAttempts: number;
  };
  summary: {
    totalInvites: number;
    totalAttempts: number;
    completedAttempts: number;
    completionRate: number;
    contactClicks: number;
    contactRate: number;
    activeCoaches: number;
  };
  funnel: Array<{ stage: string; count: number; rate: number }>;
  archetypeDistribution: Array<{ archetype: string; count: number }>;
  stageDistribution: Array<{ stage: string; count: number }>;
  coachRanking: Array<{
    id: string;
    name: string;
    customerCount: number;
    completedAttempts: number;
    followUpCount: number;
    scriptUsageCount: number;
  }>;
};

const ARCHETYPE_LABELS: Record<string, string> = {
  rule_executor: "规则对齐型",
  emotion_driven: "感受牵引型",
  experience_reliant: "经验依赖型",
  opportunity_seeker: "机会关注型",
  defensive_observer: "谨慎观望型",
  impulsive_reactor: "快速反应型",
  unknown: "未知",
};

const STAGE_LABELS: Record<string, string> = {
  pre: "认知建立期",
  mid: "行动推进期",
  post: "成果巩固期",
};

// 明细弹窗类型
type DetailModalType = "archetype" | "stage" | "coach" | null;
type DetailModalData = {
  type: DetailModalType;
  title: string;
  filterKey?: string;
  filterValue?: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  
  // 明细弹窗状态
  const [detailModal, setDetailModal] = useState<DetailModalData | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dashboard/stats?days=${days}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "加载失败");
        return;
      }
      setStats(json.data);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">数据看板</h1>
            <p className="text-sm text-gray-600 max-w-2xl">
              系统核心运营指标的可视化展示。查看邀请转化率、测评完成率、画像分布等数据。
              点击具体数据项可查看相关明细或跳转到对应管理页面。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">时间范围：</span>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value={7}>近7天</option>
              <option value={14}>近14天</option>
              <option value={30}>近30天</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : stats ? (
          <div className="space-y-6">
            {/* 今日概览 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="今日邀请"
                value={stats.today.invites}
                subtitle="发送的邀请数"
                onClick={() => setDetailModal({ type: "coach", title: "今日邀请明细" })}
              />
              <MetricCard
                title="今日测评"
                value={stats.today.completedAttempts}
                subtitle={`开始 ${stats.today.attempts} 次`}
                onClick={() => setDetailModal({ type: "coach", title: "今日测评明细" })}
              />
              <MetricCard
                title="完成率"
                value={`${stats.summary.completionRate}%`}
                subtitle={`${days}天内`}
                highlight={stats.summary.completionRate >= 70}
              />
              <MetricCard
                title="联系率"
                value={`${stats.summary.contactRate}%`}
                subtitle={`${stats.summary.contactClicks} 次点击`}
                highlight={stats.summary.contactRate >= 20}
              />
            </div>

            {/* 转化漏斗 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">转化漏斗（{days}天）</h3>
              <div className="space-y-3">
                {stats.funnel.map((item) => (
                  <div key={item.stage} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">{item.stage}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <span className="font-semibold">{item.count}</span>
                      <span className="text-sm text-gray-500 ml-1">({item.rate}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 分布图 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 画像分布 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">画像分布</h3>
                {stats.archetypeDistribution.length > 0 ? (
                  <div className="space-y-2">
                    {stats.archetypeDistribution
                      .sort((a, b) => b.count - a.count)
                      .map((item) => {
                        const total = stats.archetypeDistribution.reduce((s, i) => s + i.count, 0);
                        const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                          <button
                            key={item.archetype}
                            onClick={() => setDetailModal({
                              type: "archetype",
                              title: `${ARCHETYPE_LABELS[item.archetype] || item.archetype} 客户列表`,
                              filterKey: "archetype",
                              filterValue: item.archetype,
                            })}
                            className="w-full flex items-center gap-3 hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
                          >
                            <div className="w-28 text-sm truncate text-left">
                              {ARCHETYPE_LABELS[item.archetype] || item.archetype}
                            </div>
                            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-indigo-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="w-16 text-right text-sm">
                              {item.count} ({percent}%)
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">暂无数据</div>
                )}
                <p className="text-xs text-gray-400 mt-3">点击画像类型可查看对应客户列表</p>
              </div>

              {/* 阶段分布 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">阶段分布</h3>
                {stats.stageDistribution.length > 0 ? (
                  <div className="space-y-2">
                    {stats.stageDistribution
                      .sort((a, b) => b.count - a.count)
                      .map((item) => {
                        const total = stats.stageDistribution.reduce((s, i) => s + i.count, 0);
                        const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                          <button
                            key={item.stage}
                            onClick={() => setDetailModal({
                              type: "stage",
                              title: `${STAGE_LABELS[item.stage] || item.stage} 客户列表`,
                              filterKey: "stage",
                              filterValue: item.stage,
                            })}
                            className="w-full flex items-center gap-3 hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
                          >
                            <div className="w-28 text-sm text-left">
                              {STAGE_LABELS[item.stage] || item.stage}
                            </div>
                            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="w-16 text-right text-sm">
                              {item.count} ({percent}%)
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">暂无数据</div>
                )}
                <p className="text-xs text-gray-400 mt-3">点击阶段可查看对应客户列表</p>
              </div>
            </div>

            {/* 助教排行 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">助教效能排行</h3>
                <Link
                  href="/admin/coaches"
                  className="text-sm text-blue-600 hover:underline"
                >
                  管理助教 →
                </Link>
              </div>
              {stats.coachRanking.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">排名</th>
                        <th className="py-2 pr-4">助教</th>
                        <th className="py-2 pr-4 text-right">客户数</th>
                        <th className="py-2 pr-4 text-right">完成测评</th>
                        <th className="py-2 pr-4 text-right">跟进记录</th>
                        <th className="py-2 text-right">话术使用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.coachRanking.map((coach, index) => (
                        <tr key={coach.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 pr-4">
                            {index < 3 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${
                                index === 0 ? "bg-yellow-500" :
                                index === 1 ? "bg-gray-400" : "bg-amber-600"
                              }`}>
                                {index + 1}
                              </span>
                            ) : (
                              <span className="text-gray-500">{index + 1}</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 font-medium">{coach.name}</td>
                          <td className="py-2 pr-4 text-right">{coach.customerCount}</td>
                          <td className="py-2 pr-4 text-right">{coach.completedAttempts}</td>
                          <td className="py-2 pr-4 text-right">{coach.followUpCount}</td>
                          <td className="py-2 text-right">{coach.scriptUsageCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">暂无数据</div>
              )}
            </div>

            {/* 活跃助教数 */}
            <div className="text-sm text-gray-500 text-center">
              {days}天内活跃助教：{stats.summary.activeCoaches} 人
            </div>
          </div>
        ) : null}
      </div>

      {/* 明细弹窗 */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{detailModal.title}</h3>
              <button
                onClick={() => setDetailModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">此功能正在开发中</p>
              <p className="text-sm">
                {detailModal.filterKey && detailModal.filterValue && (
                  <>筛选条件：{detailModal.filterKey} = {detailModal.filterValue}</>
                )}
              </p>
              <p className="text-sm mt-2">
                您可以前往对应管理页面查看详细数据
              </p>
              <div className="mt-4 flex justify-center gap-3">
                {detailModal.type === "archetype" && (
                  <Link
                    href="/admin/tags"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    前往标签管理
                  </Link>
                )}
                {detailModal.type === "coach" && (
                  <Link
                    href="/admin/coaches"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    前往助教管理
                  </Link>
                )}
                <button
                  onClick={() => setDetailModal(null)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  highlight,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-4 text-left w-full ${
        highlight ? "ring-2 ring-green-500" : ""
      } ${onClick ? "hover:bg-gray-50 cursor-pointer transition-colors" : ""}`}
    >
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      {onClick && <div className="text-xs text-blue-500 mt-1">点击查看明细 →</div>}
    </Wrapper>
  );
}
