"use client";

import { useState } from "react";

export type FilterState = {
  segment: string;
  archetype: string;
  stage: string;
  activity: string;
};

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
};

const SEGMENT_OPTIONS = [
  { value: "", label: "全部分层" },
  { value: "high_potential", label: "🌟 高潜力" },
  { value: "needs_attention", label: "⚠️ 需关注" },
  { value: "active", label: "✅ 活跃" },
  { value: "inactive", label: "💤 沉默" },
  { value: "new", label: "🆕 新客户" },
];

const ARCHETYPE_OPTIONS = [
  { value: "", label: "全部画像" },
  { value: "rule_executor", label: "规则执行型" },
  { value: "emotion_driven", label: "情绪驱动型" },
  { value: "experience_reliant", label: "经验依赖型" },
  { value: "opportunity_seeker", label: "机会寻求型" },
  { value: "defensive_observer", label: "谨慎观望型" },
  { value: "impulsive_reactor", label: "快速反应型" },
];

const STAGE_OPTIONS = [
  { value: "", label: "全部阶段" },
  { value: "pre", label: "🌱 认知建立期" },
  { value: "mid", label: "🚀 行动推进期" },
  { value: "post", label: "🎯 成果巩固期" },
];

const ACTIVITY_OPTIONS = [
  { value: "", label: "全部时间" },
  { value: "7d", label: "7天内活跃" },
  { value: "14d", label: "14天内活跃" },
  { value: "30d", label: "30天内活跃" },
  { value: "older", label: "更早" },
];

export function CustomerFilter({ filters, onChange, onReset }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasFilters = filters.segment || filters.archetype || filters.stage || filters.activity;

  const filterContent = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">客户分层</label>
        <select
          value={filters.segment}
          onChange={(e) => onChange({ ...filters, segment: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          {SEGMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">画像类型</label>
        <select
          value={filters.archetype}
          onChange={(e) => onChange({ ...filters, archetype: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          {ARCHETYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">陪跑阶段</label>
        <select
          value={filters.stage}
          onChange={(e) => onChange({ ...filters, stage: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">最近活动</label>
        <select
          value={filters.activity}
          onChange={(e) => onChange({ ...filters, activity: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          {ACTIVITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={onReset}
          className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
        >
          清除筛选
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: 侧边栏筛选 */}
      <div className="hidden md:block bg-white rounded-lg shadow p-4 w-64">
        <h3 className="font-semibold mb-4">🔍 筛选条件</h3>
        {filterContent}
      </div>

      {/* Mobile: 底部抽屉 */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className={`fixed bottom-20 right-4 z-40 px-4 py-2 rounded-full shadow-lg ${
            hasFilters ? "bg-blue-600 text-white" : "bg-white text-gray-700"
          }`}
        >
          🔍 筛选 {hasFilters && `(${[filters.segment, filters.archetype, filters.stage, filters.activity].filter(Boolean).length})`}
        </button>

        {mobileOpen && (
          <>
            {/* 遮罩 */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
            />
            {/* 抽屉 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">🔍 筛选条件</h3>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-500 text-xl"
                >
                  ✕
                </button>
              </div>
              {filterContent}
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
              >
                应用筛选
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export const defaultFilters: FilterState = {
  segment: "",
  archetype: "",
  stage: "",
  activity: "",
};
