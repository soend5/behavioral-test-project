"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDisplayTag, pickHighlightBehaviorTags } from "@/lib/tag-display";
import { COMPLIANCE_NOTICE_CN, RESULT_PAGE_COPY } from "@/lib/ui-copy";
import { track, TRACKING_EVENTS } from "@/lib/tracking";

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

// v1.5: 维度显示配置
const DIMENSION_DISPLAY: Record<string, { label: string; icon: string; description: Record<DimensionLevel, string> }> = {
  rule: {
    label: "规则依赖",
    icon: "📏",
    description: {
      high: "推进前更需要明确规则/流程",
      medium: "会参考规则，也会按情况调整",
      low: "更愿意边做边校准，不强求先行",
    },
  },
  risk: {
    label: "风险防御",
    icon: "🛡️",
    description: {
      high: "更倾向先把风险收住再推进",
      medium: "风险与机会会一起权衡",
      low: "更愿意先试再逐步收敛风险",
    },
  },
  emotion: {
    label: "情绪介入",
    icon: "💭",
    description: {
      high: "反馈变化会明显影响推进节奏",
      medium: "会受影响，但能回到任务",
      low: "节奏较少被情绪带走",
    },
  },
  consistency: {
    label: "行动一致性",
    icon: "🎯",
    description: {
      high: "更能按既定节奏推进",
      medium: "能推进，但会被事件打断",
      low: "节奏容易反复，需要外部牵引",
    },
  },
};

const LEVEL_COLORS: Record<DimensionLevel, string> = {
  high: "bg-blue-500",
  medium: "bg-gray-400",
  low: "bg-amber-500",
};

export default function ResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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
        // v1.7: 埋点 - 结果页访问
        track(TRACKING_EVENTS.RESULT_PAGE_VIEW, {
          archetype: json.data.archetype?.key,
          stage: json.data.attempt?.stage,
        });
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
  const coachName = coach?.name || coach?.username || "助教";

  const stabilityTag = attempt?.tags.map(getDisplayTag).find((t) => t?.kind === "stability") ?? null;
  const highlights = attempt ? pickHighlightBehaviorTags(attempt.tags, { max: 2 }) : [];

  // 获取最显著的2个维度
  const topDimensions = dimensions
    ? Object.entries(dimensions)
        .filter(([_, level]) => level === "high" || level === "low")
        .slice(0, 2)
        .map(([key, level]) => ({
          key,
          level: level as DimensionLevel,
          config: DIMENSION_DISPLAY[key],
        }))
        .filter((d) => d.config)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">正在生成你的结果...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">
            <div>{error}</div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/t/${token}`}
              className="flex-1 text-center px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              返回邀请页
            </Link>
            <Link
              href={`/t/${token}/quiz`}
              className="flex-1 text-center px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              去完成测评
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !attempt) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* v1.5: 首屏 - 核心信息 */}
      <div className="bg-white">
        <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
          {/* 画像标题 */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              你是「{archetype?.titleCn || "待分析"}」
            </h1>
            {archetype && (
              <p className="text-lg text-gray-600 italic">
                &ldquo;{archetype.oneLinerCn}&rdquo;
              </p>
            )}
          </div>

          {/* 核心特点卡片 */}
          {topDimensions.length > 0 && (
            <div className="space-y-3 mb-8">
              <h2 className="text-sm font-medium text-gray-500 text-center">
                {RESULT_PAGE_COPY.highlightsTitle}
              </h2>
              {topDimensions.map(({ key, level, config }) => (
                <div
                  key={key}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{config.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${LEVEL_COLORS[level]}`}>
                          {level === "high" ? "偏高" : "偏低"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    {config.description[level]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 稳定度提示 */}
          {stabilityTag && (
            <p className="text-sm text-gray-500 text-center mb-6">
              {stabilityTag.explanationCn}
            </p>
          )}

          {/* CTA区域 */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h3 className="font-medium text-blue-900 mb-2 text-center">
              {RESULT_PAGE_COPY.nextStepTitle}
            </h3>
            <p className="text-sm text-blue-700 text-center mb-4">
              {RESULT_PAGE_COPY.nextStepContent}
            </p>

            {/* 助教信息 + 二维码 */}
            <div className="flex flex-col items-center gap-4">
              {coach?.wechatQrcode ? (
                <>
                  <Image
                    src={coach.wechatQrcode}
                    alt="助教微信二维码"
                    width={140}
                    height={140}
                    className="rounded-lg border-2 border-white shadow-md"
                  />
                  <p className="text-sm text-blue-800">
                    扫码添加助教 <span className="font-medium">{coachName}</span>
                  </p>
                </>
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-center gap-3 p-4 bg-white rounded-lg">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                      {coachName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">你的专属助教</div>
                      <div className="font-medium text-gray-900">{coachName}</div>
                    </div>
                  </div>
                  <Link
                    href={`/t/${token}`}
                    onClick={() => track(TRACKING_EVENTS.RESULT_CONTACT_CLICK, { hasQrCode: false })}
                    className="block w-full mt-3 text-center py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {RESULT_PAGE_COPY.contactCoachButton}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* v1.5: 详细报告（折叠） */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <button
          onClick={() => {
            setShowDetail(!showDetail);
            if (!showDetail) {
              track(TRACKING_EVENTS.RESULT_DETAIL_EXPAND);
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 text-blue-600 hover:text-blue-700"
        >
          <span>{RESULT_PAGE_COPY.detailTitle}</span>
          <span className={`transition-transform ${showDetail ? "rotate-180" : ""}`}>▼</span>
        </button>

        {showDetail && (
          <div className="mt-4 space-y-6 animate-in fade-in duration-300">
            {/* 画像详情 */}
            {archetype && archetype.traitsCn.length > 0 && (
              <section className="bg-white rounded-xl p-5 border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3">行为特征</h3>
                <ul className="space-y-2">
                  {archetype.traitsCn.map((trait, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{trait}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 所有维度 */}
            {dimensions && Object.values(dimensions).some((v) => v !== null) && (
              <section className="bg-white rounded-xl p-5 border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3">行为维度详情</h3>
                <div className="space-y-3">
                  {Object.entries(DIMENSION_DISPLAY).map(([key, config]) => {
                    const level = dimensions[key];
                    if (!level) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-lg">{config.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{config.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded text-white ${LEVEL_COLORS[level]}`}>
                              {level === "high" ? "偏高" : level === "low" ? "偏低" : "中等"}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${LEVEL_COLORS[level]} transition-all`}
                              style={{
                                width: level === "high" ? "85%" : level === "medium" ? "50%" : "25%",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 显著行为标签 */}
            {highlights.length > 0 && (
              <section className="bg-white rounded-xl p-5 border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3">显著行为特征</h3>
                <div className="space-y-3">
                  {highlights.map((t) => (
                    <div key={t.tag} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 text-sm">{t.labelCn}</div>
                      <div className="text-sm text-gray-600 mt-1">{t.explanationCn}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* 合规提示 */}
        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">{COMPLIANCE_NOTICE_CN}</p>
        </div>
      </div>
    </div>
  );
}
