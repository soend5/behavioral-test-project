"use client";

import { useState, useEffect, useMemo } from "react";
import { AdminNav } from "../_components/AdminNav";
import { csrfFetch } from "@/lib/csrf-client";

type SopDefinition = {
  sopId: string;
  sopName: string;
  sopStage: string;
  status: string;
  priority: number;
  stateSummary: string | null;
  coreGoal: string | null;
  strategyList: string[];
  forbiddenList: string[];
  notes: string | null;
  ruleCount: number;
  scriptCount: number;
  createdAt: string;
  updatedAt: string;
};

type ScriptTemplate = {
  id: string;
  name: string;
  category: string;
  triggerStage: string | null;
  content: string;
  sopId: string | null;
  usageCount: number;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

const STAGE_CONFIG = {
  pre: { label: "认知建立期", color: "bg-blue-100 text-blue-800", icon: "🌱" },
  mid: { label: "行动推进期", color: "bg-orange-100 text-orange-800", icon: "🚀" },
  post: { label: "成果巩固期", color: "bg-green-100 text-green-800", icon: "🎯" },
};

export default function StrategyCenterPage() {
  const [sops, setSops] = useState<SopDefinition[]>([]);
  const [scripts, setScripts] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>("");

  // 预览状态
  const [previewData, setPreviewData] = useState<{
    totalCustomers: number;
    archetypeDistribution: Record<string, number>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sopsRes, scriptsRes] = await Promise.all([
        fetch("/api/admin/sop/definition", { cache: "no-store" }),
        fetch("/api/admin/scripts?status=", { cache: "no-store" }),
      ]);
      
      const sopsJson = await sopsRes.json() as ApiResponse<{ sops: SopDefinition[] }>;
      const scriptsJson = await scriptsRes.json() as ApiResponse<{ scripts: ScriptTemplate[] }>;
      
      if (sopsJson.ok) {
        setSops(sopsJson.data.sops);
      }
      if (scriptsJson.ok) {
        setScripts(scriptsJson.data.scripts);
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // 按阶段分组
  const sopsByStage = useMemo(() => {
    const filtered = filterStage ? sops.filter(s => s.sopStage === filterStage) : sops;
    return {
      pre: filtered.filter(s => s.sopStage === "pre"),
      mid: filtered.filter(s => s.sopStage === "mid"),
      post: filtered.filter(s => s.sopStage === "post"),
    };
  }, [sops, filterStage]);

  const selectedSop = useMemo(() => {
    return sops.find(s => s.sopId === selectedSopId) || null;
  }, [sops, selectedSopId]);

  // 获取关联话术
  const relatedScripts = useMemo(() => {
    if (!selectedSopId) return [];
    return scripts.filter(s => s.sopId === selectedSopId);
  }, [scripts, selectedSopId]);

  // 获取可关联话术（未关联的）
  const availableScripts = useMemo(() => {
    return scripts.filter(s => !s.sopId);
  }, [scripts]);

  // 加载影响预览
  async function loadPreview(sopId: string) {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/strategy/preview?sopId=${sopId}`);
      const json = await res.json() as ApiResponse<typeof previewData>;
      if (json.ok) {
        setPreviewData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  }

  // 关联话术到 SOP
  async function linkScript(scriptId: string, sopId: string) {
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const json = await res.json() as ApiResponse<unknown>;
      if (!json.ok) {
        setError((json as ApiFail).error.message);
        return;
      }
      await loadData();
    } catch {
      setError("关联失败");
    }
  }

  // 取消关联
  async function unlinkScript(scriptId: string) {
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId: null }),
      });
      const json = await res.json() as ApiResponse<unknown>;
      if (!json.ok) {
        setError((json as ApiFail).error.message);
        return;
      }
      await loadData();
    } catch {
      setError("取消关联失败");
    }
  }

  useEffect(() => {
    if (selectedSopId) {
      void loadPreview(selectedSopId);
    } else {
      setPreviewData(null);
    }
  }, [selectedSopId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto p-4">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">策略中心</h1>
            <p className="text-sm text-gray-600">
              统一管理陪跑策略与关联话术，按阶段配置触发条件
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">全部阶段</option>
              <option value="pre">认知建立期</option>
              <option value="mid">行动推进期</option>
              <option value="post">成果巩固期</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：策略列表 */}
          <div className="space-y-4">
            {(["pre", "mid", "post"] as const).map((stage) => {
              const config = STAGE_CONFIG[stage];
              const stageSops = sopsByStage[stage];
              if (filterStage && filterStage !== stage) return null;
              
              return (
                <div key={stage} className="bg-white rounded-lg shadow">
                  <div className={`px-4 py-3 border-b ${config.color} rounded-t-lg`}>
                    <span className="mr-2">{config.icon}</span>
                    <span className="font-medium">{config.label}</span>
                    <span className="ml-2 text-sm opacity-70">({stageSops.length})</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                    {stageSops.map((sop) => (
                      <button
                        key={sop.sopId}
                        onClick={() => setSelectedSopId(sop.sopId)}
                        className={`w-full text-left p-3 rounded transition-colors ${
                          selectedSopId === sop.sopId
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium text-sm">{sop.sopName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {sop.ruleCount} 条规则 · {relatedScripts.length || 0} 条话术
                        </div>
                      </button>
                    ))}
                    {stageSops.length === 0 && (
                      <div className="text-sm text-gray-400 text-center py-4">
                        暂无策略
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧：策略详情 */}
          <div className="lg:col-span-2">
            {selectedSop ? (
              <div className="space-y-4">
                {/* 策略基本信息 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-gray-500">{selectedSop.sopId}</div>
                      <h2 className="text-xl font-semibold">{selectedSop.sopName}</h2>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      STAGE_CONFIG[selectedSop.sopStage as keyof typeof STAGE_CONFIG]?.color || "bg-gray-100"
                    }`}>
                      {STAGE_CONFIG[selectedSop.sopStage as keyof typeof STAGE_CONFIG]?.label || selectedSop.sopStage}
                    </span>
                  </div>

                  {selectedSop.coreGoal && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-xs text-blue-600 mb-1">核心目标</div>
                      <div className="font-medium text-blue-900">{selectedSop.coreGoal}</div>
                    </div>
                  )}

                  {selectedSop.strategyList.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">推荐策略</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {selectedSop.strategyList.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedSop.forbiddenList.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2 text-red-600">禁用行为</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                        {selectedSop.forbiddenList.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 影响预览 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold mb-3">📊 影响预览</h3>
                  {previewLoading ? (
                    <div className="text-sm text-gray-500">计算中...</div>
                  ) : previewData ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {previewData.totalCustomers} 位客户
                      </div>
                      <div className="text-sm text-gray-500">
                        将受此策略影响
                      </div>
                      {Object.keys(previewData.archetypeDistribution).length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-2">画像分布</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(previewData.archetypeDistribution).map(([k, v]) => (
                              <span key={k} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">暂无数据</div>
                  )}
                </div>

                {/* 关联话术 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold mb-3">💬 关联话术 ({relatedScripts.length})</h3>
                  {relatedScripts.length > 0 ? (
                    <div className="space-y-2">
                      {relatedScripts.map((script) => (
                        <div
                          key={script.id}
                          className="border rounded p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-sm">{script.name}</div>
                            <div className="text-xs text-gray-500">
                              {script.category} · 使用 {script.usageCount} 次
                            </div>
                          </div>
                          <button
                            onClick={() => void unlinkScript(script.id)}
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                          >
                            取消关联
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mb-3">暂无关联话术</div>
                  )}

                  {/* 添加关联 */}
                  {availableScripts.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-medium mb-2">添加关联话术</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {availableScripts.slice(0, 10).map((script) => (
                          <button
                            key={script.id}
                            onClick={() => void linkScript(script.id, selectedSop.sopId)}
                            className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm"
                          >
                            <span className="font-medium">{script.name}</span>
                            <span className="text-gray-500 ml-2">({script.category})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                请从左侧选择一个策略查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
