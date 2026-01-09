"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDisplayTag, pickHighlightBehaviorTags } from "@/lib/tag-display";
import { COMPLIANCE_NOTICE_CN, RESULT_PAGE_COPY } from "@/lib/ui-copy";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type DimensionLevel = "high" | "medium" | "low";

type ResultData = {
  attempt: {
    id: string;
    version: string;
    submittedAt: string | null;
    tags: string[];
    stage: string | null;
    resultSummary: unknown;
  };
  archetype: {
    key: string;
    titleCn: string;
    oneLinerCn: string;
    traitsCn: string[];
  } | null;
  dimensions: Record<string, DimensionLevel | null>;
  coach: {
    id: string;
    username: string;
    name: string | null;
    wechatQrcode: string | null;
  } | null;
};

// 维度显示配置
const DIMENSION_DISPLAY: Record<string, { label: string; icon: string }> = {
  rule: { label: "规则依赖", icon: "📏" },
  risk: { label: "风险防御", icon: "🛡️" },
  emotion: { label: "情绪介入", icon: "💭" },
  consistency: { label: "行动一致性", icon: "🎯" },
  opportunity: { label: "机会敏感", icon: "🔍" },
  experience: { label: "经验依赖", icon: "📚" },
};

const LEVEL_DISPLAY: Record<DimensionLevel, { label: string; color: string }> = {
  high: { label: "偏高", color: "bg-blue-100 text-blue-800 border-blue-200" },
  medium: { label: "中等", color: "bg-gray-100 text-gray-700 border-gray-200" },
  low: { label: "偏低", color: "bg-amber-100 text-amber-800 border-amber-200" },
};

export default function ResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);

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
        setData(json.data);
      } catch {
        setError("加载失败，请稍后重试");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [token]);

  const attempt = data?.attempt;
  const archetype = data?.archetype;
  const dimensions = data?.dimensions;
  const coach = data?.coach;

  const archetypeTag = attempt?.tags.map(getDisplayTag).find((t) => t?.kind === "archetype") ?? null;
  const stabilityTag = attempt?.tags.map(getDisplayTag).find((t) => t?.kind === "stability") ?? null;
  const highlights = attempt ? pickHighlightBehaviorTags(attempt.tags, { max: 2 }) : [];

  // 生成个性化摘要
  const getSummaryText = () => {
    if (!archetype) {
      return "本次回答呈现出一定的推进偏好与节奏信号。";
    }
    return `本次回答更接近「${archetype.titleCn}」这类推进方式。`;
  };

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

        {data && attempt ? (
          <div className="space-y-6">
            {/* Section A: 一句话摘要 + 原型信息 */}
            <section className="border rounded p-5">
              <div className="text-sm text-gray-500 mb-2">A) {RESULT_PAGE_COPY.summaryTitle}</div>
              <div className="text-gray-900 leading-relaxed space-y-2">
                <p>{RESULT_PAGE_COPY.summaryIntro}</p>
                <p className="font-medium">{getSummaryText()}</p>
                {archetype && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded">
                    <div className="text-blue-900 italic">&ldquo;{archetype.oneLinerCn}&rdquo;</div>
                    {archetype.traitsCn.length > 0 && (
                      <ul className="mt-2 text-sm text-blue-800 space-y-1">
                        {archetype.traitsCn.slice(0, 2).map((trait, i) => (
                          <li key={i}>• {trait}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {stabilityTag && (
                  <p className="text-sm text-gray-600 mt-2">{stabilityTag.explanationCn}</p>
                )}
              </div>
            </section>

            {/* Section B: 行为维度 */}
            {dimensions && Object.values(dimensions).some((v) => v !== null) && (
              <section className="border rounded p-5">
                <div className="text-sm text-gray-500 mb-3">B) {RESULT_PAGE_COPY.dimensionsTitle}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(DIMENSION_DISPLAY).map(([key, config]) => {
                    const level = dimensions[key];
                    if (!level) return null;
                    const levelConfig = LEVEL_DISPLAY[level];
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded border ${levelConfig.color}`}
                      >
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </div>
                        <div className="text-xs mt-1">{levelConfig.label}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Section C: 显著行为特征 */}
            <section className="border rounded p-5">
              <div className="text-sm text-gray-500 mb-3">C) {RESULT_PAGE_COPY.highlightsTitle}</div>
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
                  {RESULT_PAGE_COPY.noHighlights}
                </div>
              )}
            </section>

            {/* Section D: 下一步建议 */}
            <section className="border rounded p-5 bg-blue-50 border-blue-200">
              <div className="text-sm text-blue-700 mb-2">D) {RESULT_PAGE_COPY.nextStepTitle}</div>
              <div className="text-blue-900 mb-4">
                {RESULT_PAGE_COPY.nextStepContent}
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
                {COMPLIANCE_NOTICE_CN}
              </div>
            </section>

            {/* Section E: 联系助教 (如有二维码) */}
            {coach && (coach.wechatQrcode || coach.name) && (
              <section className="border rounded p-5">
                <div className="text-sm text-gray-500 mb-3">E) {RESULT_PAGE_COPY.contactCoachTitle}</div>
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {coach.name || coach.username}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      扫描二维码添加助教微信，获取更具体的陪跑建议。
                    </div>
                  </div>
                  {coach.wechatQrcode && (
                    <div className="flex-shrink-0">
                      <Image
                        src={coach.wechatQrcode}
                        alt="助教微信二维码"
                        width={128}
                        height={128}
                        className="rounded border"
                      />
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
