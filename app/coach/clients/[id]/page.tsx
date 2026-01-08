"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CoachNav } from "../../_components/CoachNav";
import { getDisplayTag, getStageDisplay } from "@/lib/tag-display";

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
      const res = await fetch(`/api/coach/customers/${customerId}/tags`, {
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
      const res = await fetch(
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
          <h1 className="text-2xl font-bold">客户详情</h1>
          <Link
            href="/coach/dashboard"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            返回客户列表
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-3">客户信息</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-3">最新测评</h2>
                {data.latestAttempt ? (
                  <div className="space-y-4">
                    {(() => {
                      const stageMeta = getStageDisplay(data.latestAttempt.stage);
                      return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="border rounded p-3">
                        <div className="text-gray-500">版本</div>
                        <div className="font-semibold">
                          {data.latestAttempt.quizVersion} / {data.latestAttempt.version}
                        </div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="text-gray-500">提交时间</div>
                        <div className="font-semibold">
                          {new Date(data.latestAttempt.submittedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="text-gray-500">阶段</div>
                        <div className="font-semibold">
                          {stageMeta.labelCn.replace("陪跑阶段：", "")}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{stageMeta.explanationCn}</div>
                      </div>
                    </div>
                      );
                    })()}

                    <div className="border rounded p-4">
                      <div className="text-sm text-gray-500 mb-2">可见标签（展示映射）</div>
                      <div className="flex flex-wrap gap-2">
                        {displaySystemTags.map((t) => (
                          <span
                            key={t.tag}
                            title={t.explanationCn}
                            className="text-xs bg-gray-50 border rounded px-2 py-1"
                          >
                            {t.labelCn}
                          </span>
                        ))}
                        {!displaySystemTags.length ? (
                          <span className="text-sm text-gray-400">无</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="border rounded p-4">
                      <div className="text-sm text-gray-500 mb-2">逐题答案</div>
                      {data.latestAttempt.answers.length ? (
                        <div className="space-y-3">
                          {data.latestAttempt.answers.map((a) => {
                            const hint = a.hintTag ? getDisplayTag(a.hintTag) : null;
                            return (
                              <div key={a.questionId} className="border rounded p-4 bg-white">
                                <div className="text-sm font-semibold mb-2">
                                  Q{a.orderNo ?? "-"}：{a.stem ?? a.questionId}
                                </div>
                                <div className="text-sm text-gray-900 mb-2">
                                  <span className="text-gray-500">A：</span>
                                  {a.optionText || a.optionId}
                                </div>
                                <div className="text-sm text-gray-700">
                                  <span className="text-gray-500">Hint：</span>
                                  {hint ? `${hint.labelCn} · ${hint.explanationCn}` : "—"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">暂无答案</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">暂无已提交的测评记录</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-3">测评时间线</h2>
                {data.attemptTimeline.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-2">提交时间</th>
                          <th className="py-2 pr-2">版本</th>
                          <th className="py-2 pr-2">阶段</th>
                          <th className="py-2 pr-2">标签数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attemptTimeline.map((a) => (
                          <tr key={a.id} className="border-b">
                            <td className="py-2 pr-2">
                              {new Date(a.submittedAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-2">
                              {a.quizVersion}/{a.version}
                            </td>
                            <td className="py-2 pr-2">
                              {getStageDisplay(a.stage).labelCn.replace("陪跑阶段：", "")}
                            </td>
                            <td className="py-2 pr-2">{a.tags.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">暂无记录</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-3">实时陪跑提示区</h2>
                <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                  提示：以下为沟通策略建议与行为结构画像参考，不构成投资顾问服务或任何买卖建议，不承诺收益。
                </div>
                {data.realtimePanel ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">阶段：</span>
                      <span className="font-semibold">{data.realtimePanel.stage}</span>
                    </div>
                    {data.realtimePanel.stateSummary ? (
                      <div>
                        <div className="text-gray-500">状态判断</div>
                        <div className="font-medium">{data.realtimePanel.stateSummary}</div>
                      </div>
                    ) : null}
                    {data.realtimePanel.coreGoal ? (
                      <div className="border rounded p-3 bg-blue-50 border-blue-200">
                        <div className="text-blue-700 text-xs mb-1">唯一目标</div>
                        <div className="font-semibold text-blue-900">
                          {data.realtimePanel.coreGoal}
                        </div>
                      </div>
                    ) : null}
                    {data.realtimePanel.strategyList?.length ? (
                      <div>
                        <div className="text-gray-500 mb-1">推荐沟通策略（最多 3 条）</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {data.realtimePanel.strategyList.slice(0, 3).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {data.realtimePanel.forbiddenList?.length ? (
                      <div>
                        <div className="text-gray-500 mb-1">禁用行为</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {data.realtimePanel.forbiddenList.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">暂无</p>
                )}
              </div>

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
                  {!displayAllTags.length ? (
                    <span className="text-sm text-gray-400">无</span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">添加助教标签（coach:*）</div>
                  <div className="flex gap-2">
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="例如 coach:high_value"
                      className="border rounded px-3 py-2 flex-1"
                    />
                    <button
                      onClick={() => void addTag()}
                      disabled={tagSubmitting || !newTag.trim()}
                      className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                    >
                      添加
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">已添加的助教标签</div>
                  <div className="space-y-2">
                    {coachTags.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between border rounded px-3 py-2"
                      >
                        <div className="text-sm">
                          {getDisplayTag(t.tagKey)?.labelCn ?? "助教标记"}
                        </div>
                        <button
                          onClick={() => void deleteTag(t.tagKey)}
                          className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    {!coachTags.length ? (
                      <p className="text-sm text-gray-500">暂无助教标签</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">未找到客户</div>
        )}
      </div>
    </div>
  );
}

