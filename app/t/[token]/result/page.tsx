"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDisplayTag, pickHighlightBehaviorTags } from "@/lib/tag-display";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type ResultData = {
  attempt: {
    id: string;
    version: string;
    submittedAt: string | null;
    tags: string[];
    stage: string | null;
    resultSummary: unknown;
  };
};

export default function ResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData["attempt"] | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/public/attempt/result?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as ApiResponse<ResultData>;
        if (!json.ok) {
          setError(json.error.message);
          setData(null);
          return;
        }
        setData(json.data.attempt);
      } catch {
        setError("加载失败，请稍后重试");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [token]);

  const archetypeTag = data?.tags.map(getDisplayTag).find((t) => t?.kind === "archetype") ?? null;
  const stabilityTag = data?.tags.map(getDisplayTag).find((t) => t?.kind === "stability") ?? null;
  const highlights = data ? pickHighlightBehaviorTags(data.tags, { max: 2 }) : [];
  const archetypeShortLabel = archetypeTag?.labelCn.replace("推进方式：", "") ?? null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">测评结果概览</h1>
        <p className="text-gray-600 mb-6">用于帮助你与助教对齐下一步推进节奏。</p>

        {loading ? <div>加载中...</div> : null}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-6">
            <div>{error}</div>
            <div className="mt-3 flex gap-3">
              <Link
                href={`/t/${token}`}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                返回邀请页
              </Link>
              <Link
                href={`/t/${token}/quiz`}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                去完成测评
              </Link>
            </div>
          </div>
        ) : null}

        {data ? (
          <div className="space-y-6">
            <section className="border rounded p-5">
              <div className="text-sm text-gray-500 mb-2">A) 一句话摘要</div>
              <div className="text-gray-900 leading-relaxed">
                <p>这份结果是你在推进不确定事情时的一次节奏快照。</p>
                <p>
                  {archetypeShortLabel
                    ? `本次回答更接近「${archetypeShortLabel}」这类推进方式。`
                    : "本次回答呈现出一定的推进偏好与节奏信号。"}
                </p>
                <p>
                  {stabilityTag?.explanationCn ?? "下面选取 1–2 个更显著的行为点，方便你和助教快速对齐。"}
                </p>
              </div>
            </section>

            <section className="border rounded p-5">
              <div className="text-sm text-gray-500 mb-3">B) 显著行为特征</div>
              {highlights.length ? (
                <ul className="space-y-3">
                  {highlights.map((t) => (
                    <li key={t.tag} className="border rounded p-3 bg-gray-50">
                      <div className="font-semibold">{t.labelCn}</div>
                      <div className="text-sm text-gray-700">{t.explanationCn}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-700">
                  暂无可展示的行为点。你可以先完成测评，或联系助教协助核对状态。
                </div>
              )}
            </section>

            <section className="border rounded p-5 bg-blue-50 border-blue-200">
              <div className="text-sm text-blue-700 mb-2">C) 下一步建议</div>
              <div className="text-blue-900 mb-4">
                请联系助教，把这份概览作为沟通起点，获得更具体的下一步推进建议。
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/t/${token}`}
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                >
                  返回邀请页联系助教
                </Link>
              </div>
              <div className="mt-3 text-xs text-blue-800">
                提示：本页仅用于沟通参考，不构成投资顾问服务或任何买卖建议，不承诺收益。
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

