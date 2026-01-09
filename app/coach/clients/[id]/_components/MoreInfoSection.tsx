"use client";

import { useState } from "react";
import { getDisplayTag, getStageDisplay } from "@/lib/tag-display";

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
  coachTags: { id: string; tagKey: string; createdAt: string }[];
  realtimePanel: {
    stage: string;
    stateSummary?: string | null;
    coreGoal?: string | null;
    strategyList?: string[];
    forbiddenList?: string[];
  } | null;
};

type Props = {
  data: CustomerDetail;
};

export function MoreInfoSection({ data }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold">📁 更多信息</span>
        <span className="text-gray-400">{expanded ? "▲ 收起" : "▼ 展开"}</span>
      </button>

      {expanded && (
        <div className="border-t p-6 space-y-6">
          {/* 最新测评详情 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">最新测评</h3>
            {data.latestAttempt ? (
              <div className="space-y-4">
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
                    <div className="text-gray-500">陪跑阶段</div>
                    <div className="font-semibold">
                      {getStageDisplay(data.latestAttempt.stage).labelCn}
                    </div>
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
                              <span className="text-gray-500">行为点：</span>
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

          {/* 测评时间线 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">测评时间线</h3>
            {data.attemptTimeline.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2">提交时间</th>
                      <th className="py-2 pr-2">版本</th>
                      <th className="py-2 pr-2">陪跑阶段</th>
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
                          {getStageDisplay(a.stage).labelCn}
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
      )}
    </div>
  );
}
