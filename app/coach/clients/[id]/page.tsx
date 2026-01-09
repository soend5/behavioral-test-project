"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CoachNav } from "../../_components/CoachNav";
import { getDisplayTag, getStageDisplay } from "@/lib/tag-display";
import { COMPLIANCE_NOTICES } from "@/lib/ui-copy";
import { csrfFetch } from "@/lib/csrf-client";
import { ScriptPanel } from "./_components/ScriptPanel";
import { FollowUpSection } from "./_components/FollowUpSection";
import { KeyInfoCard } from "./_components/KeyInfoCard";
import { MoreInfoSection } from "./_components/MoreInfoSection";

type CoachTag = { id: string; tagKey: string; createdAt: string };
type AttemptTimelineItem = {
  id: string;
  version: string;
  quizVersion: string;
  submittedAt: string;
  tags: string[];
  stage: string | null;
};

type LatestAttempt = {
  id: string;
  version: string;
  quizVersion: string;
  submittedAt: string;
  tags: string[];
  stage: string | null;
  answers: Array<{
    questionId: string;
    orderNo: number | null;
    stem: string | null;
    optionId: string;
    optionText: string | null;
    hintTag: string | null;
  }>;
  resultSummary: any;
};

type CustomerDetail = {
  customer: {
    id: string;
    name: string | null;
    nickname: string | null;
    phone: string | null;
    wechat: string | null;
    qq: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  };
  latestAttempt: LatestAttempt | null;
  attemptTimeline: AttemptTimelineItem[];
  coachTags: CoachTag[];
  realtimePanel: {
    stage: string;
    stateSummary?: string | null;
    coreGoal?: string | null;
    strategyList?: string[];
    forbiddenList?: string[];
  } | null;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

function buildReadableSuggestion(panel: CustomerDetail["realtimePanel"]): string {
  if (!panel) return "";
  const coreGoal = panel.coreGoal?.trim() || "";
  const strategy = panel.strategyList?.[0]?.trim() || "";

  if (coreGoal && strategy) {
    return `建议（可照读）：我们先把目标对齐到「${coreGoal}」，然后用「${strategy}」推进下一步。`;
  }
  if (coreGoal) {
    return `建议（可照读）：我们先把目标对齐到「${coreGoal}」，再一起确认下一步动作。`;
  }
  if (strategy) {
    return `建议（可照读）：我们先从「${strategy}」开始，边推进边收敛下一步。`;
  }
  return "建议（可照读）：我们先对齐当前目标与边界，再一起确认下一步动作。";
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerDetail | null>(null);

  const [newTag, setNewTag] = useState("");
  const [tagSubmitting, setTagSubmitting] = useState(false);

  const systemTags = useMemo(() => data?.latestAttempt?.tags || [], [data]);
  const coachTags = useMemo(() => data?.coachTags || [], [data]);
  const allTags = useMemo(() => {
    const s = new Set([...systemTags, ...coachTags.map((t) => t.tagKey)]);
    return Array.from(s.values());
  }, [systemTags, coachTags]);

  const displayAllTags = useMemo(() => {
    return allTags
      .map(getDisplayTag)
      .filter((t): t is NonNullable<ReturnType<typeof getDisplayTag>> => t !== null);
  }, [allTags]);

  const displaySystemTags = useMemo(() => {
    return systemTags
      .map(getDisplayTag)
      .filter((t): t is NonNullable<ReturnType<typeof getDisplayTag>> => t !== null);
  }, [systemTags]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coach/customers/${customerId}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<CustomerDetail>;
      if (!json.ok) {
        setError(json.error.message);
        setData(null);
        return;
      }
      setData(json.data);
    } catch {
      setError("加载失败");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTag() {
    const tagKey = newTag.trim();
    if (!tagKey) return;
    if (!tagKey.startsWith("coach:")) {
      setError("标签必须以 'coach:' 开头");
      return;
    }
    setTagSubmitting(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/coach/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagKey }),
      });
      const json = (await res.json()) as ApiResponse<{ tag: unknown }>;
      if (!json.ok) {
        setError(json.error.message);
        setTagSubmitting(false);
        return;
      }
      setNewTag("");
      await load();
    } catch {
      setError("添加失败");
    } finally {
      setTagSubmitting(false);
    }
  }

  async function deleteTag(tagKey: string) {
    setError(null);
    try {
      const res = await csrfFetch(
        `/api/coach/customers/${customerId}/tags?tagKey=${encodeURIComponent(tagKey)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("删除失败");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">参与者详情</h1>
          <Link
            href="/coach/dashboard"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            返回档案列表
          </Link>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-6">加载中...</div>
        ) : data ? (
          <div className="space-y-6">
            {/* v1.9: 关键信息卡片置顶 */}
            <KeyInfoCard
              archetype={data.latestAttempt?.resultSummary?.archetype}
              stage={data.latestAttempt?.stage || data.realtimePanel?.stage}
              tags={data.latestAttempt?.tags || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧主内容区 */}
              <div className="lg:col-span-2 space-y-6">
                {/* v1.9: 话术面板上移到主内容区顶部 */}
                <ScriptPanel
                  customerId={customerId}
                  customerName={data.customer.nickname || data.customer.name || undefined}
                  archetype={data.latestAttempt?.resultSummary?.archetype}
                />

                {/* 陪跑建议精简版 */}
                {data.realtimePanel && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-3">📋 陪跑建议</h2>
                    <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                      {COMPLIANCE_NOTICES.coach_panel}
                    </div>
                    <div className="space-y-3 text-sm">
                      {(() => {
                        const stageMeta = getStageDisplay(data.realtimePanel.stage);
                        const readable = buildReadableSuggestion(data.realtimePanel);
                        return (
                          <>
                            <div className="border rounded p-3 bg-blue-50 border-blue-200">
                              <div className="text-blue-700 text-xs mb-1">可照读的一句话建议</div>
                              <div className="font-medium text-blue-900">{readable}</div>
                            </div>
                            {data.realtimePanel.coreGoal && (
                              <div className="border rounded p-3 bg-green-50 border-green-200">
                                <div className="text-green-700 text-xs mb-1">当前唯一目标</div>
                                <div className="font-semibold text-green-900">
                                  {data.realtimePanel.coreGoal}
                                </div>
                              </div>
                            )}
                            {data.realtimePanel.strategyList?.length ? (
                              <div>
                                <div className="text-gray-500 mb-1">推荐策略</div>
                                <ul className="list-disc pl-5 space-y-1">
                                  {data.realtimePanel.strategyList.slice(0, 3).map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* 快速记录入口 */}
                <FollowUpSection customerId={customerId} />

                {/* 更多信息（默认折叠） */}
                <MoreInfoSection data={data} />
              </div>

              {/* 右侧边栏 */}
              <div className="space-y-6">
                {/* 参与者基本信息 */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-3">参与者信息</h2>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">昵称：</span>
                      <span>{data.customer.nickname || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">姓名：</span>
                      <span>{data.customer.name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">手机号：</span>
                      <span>{data.customer.phone || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">备注：</span>
                      <span>{data.customer.note || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* 标签管理 */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-3">标签</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {displayAllTags.map((t) => (
                      <span
                        key={t.tag}
                        title={t.explanationCn}
                        className={`text-xs border rounded px-2 py-1 ${
                          t.kind === "coach"
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        {t.labelCn}
                      </span>
                    ))}
                    {!displayAllTags.length && (
                      <span className="text-sm text-gray-400">无</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">添加助教标签</div>
                    <div className="flex gap-2">
                      <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="coach:high_value"
                        className="border rounded px-3 py-2 flex-1 text-sm"
                      />
                      <button
                        onClick={() => void addTag()}
                        disabled={tagSubmitting || !newTag.trim()}
                        className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  {coachTags.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">已添加</div>
                      <div className="space-y-2">
                        {coachTags.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between border rounded px-3 py-2"
                          >
                            <div className="text-sm">
                              {getDisplayTag(t.tagKey)?.labelCn ?? t.tagKey}
                            </div>
                            <button
                              onClick={() => void deleteTag(t.tagKey)}
                              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">未找到档案</div>
        )}
      </div>
    </div>
  );
}

