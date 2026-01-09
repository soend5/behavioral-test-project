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
  createdAt: string;
  updatedAt: string;
};

type SopRule = {
  ruleId: string;
  sopId: string;
  sop: { sopId: string; sopName: string; sopStage: string };
  requiredStage: string | null;
  requiredTags: string[];
  excludedTags: string[];
  confidence: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type TabType = "definitions" | "rules";

export default function AdminSOPPage() {
  const [activeTab, setActiveTab] = useState<TabType>("definitions");
  const [sops, setSops] = useState<SopDefinition[]>([]);
  const [rules, setRules] = useState<SopRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SOP Definition 编辑状态
  const [editingSopId, setEditingSopId] = useState<string | null>(null);
  const [sopDraft, setSopDraft] = useState<Record<string, any>>({});
  const [savingSop, setSavingSop] = useState(false);

  // SOP Definition 创建状态
  const [creatingSop, setCreatingSop] = useState(false);
  const [newSop, setNewSop] = useState({
    sopId: "",
    sopName: "",
    sopStage: "pre",
    priority: "0",
    stateSummary: "",
    coreGoal: "",
    strategyList: "",
    forbiddenList: "",
    notes: "",
  });

  // SOP Rule 编辑状态
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<Record<string, any>>({});
  const [savingRule, setSavingRule] = useState(false);

  // SOP Rule 创建状态
  const [creatingRule, setCreatingRule] = useState(false);
  const [newRule, setNewRule] = useState({
    ruleId: "",
    sopId: "",
    requiredStage: "pre",
    requiredTags: "",
    excludedTags: "",
    confidence: "50",
  });

  // 筛选状态
  const [filterSopId, setFilterSopId] = useState("");

  const selectedSop = useMemo(() => {
    return sops.find((s) => s.sopId === editingSopId) || null;
  }, [sops, editingSopId]);

  const filteredRules = useMemo(() => {
    if (!filterSopId) return rules;
    return rules.filter((r) => r.sopId === filterSopId);
  }, [rules, filterSopId]);

  async function loadSops() {
    try {
      const res = await fetch("/api/admin/sop/definition", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{ sops: SopDefinition[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setSops([]);
        return;
      }
      setSops(json.data.sops);
    } catch {
      setError("加载 SOP 失败");
      setSops([]);
    }
  }

  async function loadRules() {
    try {
      const res = await fetch("/api/admin/sop/rule", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{ rules: SopRule[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setRules([]);
        return;
      }
      setRules(json.data.rules);
    } catch {
      setError("加载规则失败");
      setRules([]);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    await Promise.all([loadSops(), loadRules()]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SOP Definition CRUD
  function startEditSop(sop: SopDefinition) {
    setEditingSopId(sop.sopId);
    setSopDraft({
      sopName: sop.sopName,
      sopStage: sop.sopStage,
      priority: String(sop.priority),
      status: sop.status,
      stateSummary: sop.stateSummary || "",
      coreGoal: sop.coreGoal || "",
      strategyList: sop.strategyList.join("\n"),
      forbiddenList: sop.forbiddenList.join("\n"),
      notes: sop.notes || "",
    });
  }

  async function saveSop() {
    if (!editingSopId) return;
    setSavingSop(true);
    setError(null);
    try {
      const strategyList = sopDraft.strategyList
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const forbiddenList = sopDraft.forbiddenList
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const res = await csrfFetch(`/api/admin/sop/definition/${editingSopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopName: sopDraft.sopName,
          sopStage: sopDraft.sopStage,
          priority: sopDraft.priority,
          status: sopDraft.status,
          stateSummary: sopDraft.stateSummary || null,
          coreGoal: sopDraft.coreGoal || null,
          strategyListJson: strategyList,
          forbiddenListJson: forbiddenList,
          notes: sopDraft.notes || null,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ sop: any }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingSopId(null);
      setSopDraft({});
      await loadSops();
    } catch {
      setError("保存失败");
    } finally {
      setSavingSop(false);
    }
  }

  async function createSop() {
    if (!newSop.sopId.trim() || !newSop.sopName.trim()) return;
    setCreatingSop(true);
    setError(null);
    try {
      const strategyList = newSop.strategyList
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const forbiddenList = newSop.forbiddenList
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await csrfFetch("/api/admin/sop/definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopId: newSop.sopId.trim(),
          sopName: newSop.sopName.trim(),
          sopStage: newSop.sopStage,
          priority: newSop.priority,
          stateSummary: newSop.stateSummary || null,
          coreGoal: newSop.coreGoal || null,
          strategyListJson: strategyList.length ? strategyList : null,
          forbiddenListJson: forbiddenList.length ? forbiddenList : null,
          notes: newSop.notes || null,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ sop: any }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewSop({
        sopId: "",
        sopName: "",
        sopStage: "pre",
        priority: "0",
        stateSummary: "",
        coreGoal: "",
        strategyList: "",
        forbiddenList: "",
        notes: "",
      });
      await loadSops();
    } catch {
      setError("创建失败");
    } finally {
      setCreatingSop(false);
    }
  }

  async function deleteSop(sop: SopDefinition) {
    const input = window.prompt(`将删除 SOP「${sop.sopName}」及其所有规则。如确认请输入：确认删除`);
    if (input !== "确认删除") return;
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/sop/definition/${sop.sopId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      if (editingSopId === sop.sopId) {
        setEditingSopId(null);
        setSopDraft({});
      }
      await load();
    } catch {
      setError("删除失败");
    }
  }

  // SOP Rule CRUD
  function startEditRule(rule: SopRule) {
    setEditingRuleId(rule.ruleId);
    setRuleDraft({
      requiredStage: rule.requiredStage || "pre",
      requiredTags: rule.requiredTags.join("\n"),
      excludedTags: rule.excludedTags.join("\n"),
      confidence: String(rule.confidence),
      status: rule.status,
    });
  }

  async function saveRule() {
    if (!editingRuleId) return;
    setSavingRule(true);
    setError(null);
    try {
      const requiredTags = ruleDraft.requiredTags
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const excludedTags = ruleDraft.excludedTags
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const res = await csrfFetch(`/api/admin/sop/rule/${editingRuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredStage: ruleDraft.requiredStage,
          requiredTagsJson: requiredTags.length ? requiredTags : null,
          excludedTagsJson: excludedTags.length ? excludedTags : null,
          confidence: ruleDraft.confidence,
          status: ruleDraft.status,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ rule: any }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingRuleId(null);
      setRuleDraft({});
      await loadRules();
    } catch {
      setError("保存失败");
    } finally {
      setSavingRule(false);
    }
  }

  async function createRule() {
    if (!newRule.ruleId.trim() || !newRule.sopId) return;
    setCreatingRule(true);
    setError(null);
    try {
      const requiredTags = newRule.requiredTags
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const excludedTags = newRule.excludedTags
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await csrfFetch("/api/admin/sop/rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: newRule.ruleId.trim(),
          sopId: newRule.sopId,
          requiredStage: newRule.requiredStage,
          requiredTagsJson: requiredTags.length ? requiredTags : null,
          excludedTagsJson: excludedTags.length ? excludedTags : null,
          confidence: newRule.confidence,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ rule: any }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewRule({
        ruleId: "",
        sopId: "",
        requiredStage: "pre",
        requiredTags: "",
        excludedTags: "",
        confidence: "50",
      });
      await load();
    } catch {
      setError("创建失败");
    } finally {
      setCreatingRule(false);
    }
  }

  async function deleteRule(rule: SopRule) {
    const input = window.prompt(`将删除规则「${rule.ruleId}」。如确认请输入：确认删除`);
    if (input !== "确认删除") return;
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/sop/rule/${rule.ruleId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      if (editingRuleId === rule.ruleId) {
        setEditingRuleId(null);
        setRuleDraft({});
      }
      await load();
    } catch {
      setError("删除失败");
    }
  }

  const stageOptions = [
    { value: "pre", label: "pre（认知建立期）" },
    { value: "mid", label: "mid（行动推进期）" },
    { value: "post", label: "post（成果巩固期）" },
  ];

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
        <h1 className="text-2xl font-bold mb-1">SOP 配置管理</h1>
        <p className="text-sm text-gray-600 mb-4">
          管理 SOP Definition 与匹配规则，用于助教端实时陪跑提示。
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("definitions")}
            className={`px-4 py-2 rounded ${
              activeTab === "definitions"
                ? "bg-blue-600 text-white"
                : "bg-white border hover:bg-gray-50"
            }`}
          >
            SOP 定义 ({sops.length})
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded ${
              activeTab === "rules"
                ? "bg-blue-600 text-white"
                : "bg-white border hover:bg-gray-50"
            }`}
          >
            匹配规则 ({rules.length})
          </button>
        </div>

        {/* SOP Definition Tab */}
        {activeTab === "definitions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 左侧：SOP 列表 */}
            <div className="space-y-4">
              {/* 创建新 SOP */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="font-semibold mb-3">新建 SOP</div>
                <div className="space-y-2">
                  <input
                    value={newSop.sopId}
                    onChange={(e) => setNewSop((p) => ({ ...p, sopId: e.target.value }))}
                    placeholder="SOP ID（如 sop_pre_trust）"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <input
                    value={newSop.sopName}
                    onChange={(e) => setNewSop((p) => ({ ...p, sopName: e.target.value }))}
                    placeholder="SOP 名称"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={newSop.sopStage}
                    onChange={(e) => setNewSop((p) => ({ ...p, sopStage: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {stageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => void createSop()}
                    disabled={creatingSop || !newSop.sopId.trim() || !newSop.sopName.trim()}
                    className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 text-sm"
                  >
                    {creatingSop ? "创建中..." : "创建 SOP"}
                  </button>
                </div>
              </div>

              {/* SOP 列表 */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="font-semibold mb-3">SOP 列表</div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {sops.map((sop) => (
                    <button
                      key={sop.sopId}
                      onClick={() => startEditSop(sop)}
                      className={`w-full text-left border rounded p-3 ${
                        editingSopId === sop.sopId
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{sop.sopName}</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          sop.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {sop.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {sop.sopStage} · 优先级 {sop.priority} · {sop.ruleCount} 条规则
                      </div>
                    </button>
                  ))}
                  {!sops.length && (
                    <div className="text-sm text-gray-500 text-center py-4">暂无 SOP</div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：SOP 编辑 */}
            <div className="lg:col-span-2">
              {selectedSop ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-gray-500">{selectedSop.sopId}</div>
                      <div className="text-xl font-semibold">{selectedSop.sopName}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void deleteSop(selectedSop)}
                        disabled={savingSop}
                        className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => { setEditingSopId(null); setSopDraft({}); }}
                        className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => void saveSop()}
                        disabled={savingSop}
                        className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                      >
                        {savingSop ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-1">名称</div>
                      <input
                        value={sopDraft.sopName || ""}
                        onChange={(e) => setSopDraft((p) => ({ ...p, sopName: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">阶段</div>
                      <select
                        value={sopDraft.sopStage || "pre"}
                        onChange={(e) => setSopDraft((p) => ({ ...p, sopStage: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                      >
                        {stageOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">优先级</div>
                      <input
                        type="number"
                        value={sopDraft.priority || "0"}
                        onChange={(e) => setSopDraft((p) => ({ ...p, priority: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">状态</div>
                      <select
                        value={sopDraft.status || "active"}
                        onChange={(e) => setSopDraft((p) => ({ ...p, status: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">状态判断</div>
                    <input
                      value={sopDraft.stateSummary || ""}
                      onChange={(e) => setSopDraft((p) => ({ ...p, stateSummary: e.target.value }))}
                      placeholder="如：客户处于认知建立期，需要建立信任"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">核心目标</div>
                    <input
                      value={sopDraft.coreGoal || ""}
                      onChange={(e) => setSopDraft((p) => ({ ...p, coreGoal: e.target.value }))}
                      placeholder="如：建立信任，了解客户真实需求"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-sm font-medium mb-1">推荐策略（每行一条）</div>
                      <textarea
                        value={sopDraft.strategyList || ""}
                        onChange={(e) => setSopDraft((p) => ({ ...p, strategyList: e.target.value }))}
                        placeholder="建立信任&#10;了解需求&#10;提供价值"
                        className="w-full border rounded px-3 py-2 h-32"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">禁用行为（每行一条）</div>
                      <textarea
                        value={sopDraft.forbiddenList || ""}
                        onChange={(e) => setSopDraft((p) => ({ ...p, forbiddenList: e.target.value }))}
                        placeholder="过度推销&#10;承诺收益&#10;施加压力"
                        className="w-full border rounded px-3 py-2 h-32"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">备注</div>
                    <textarea
                      value={sopDraft.notes || ""}
                      onChange={(e) => setSopDraft((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full border rounded px-3 py-2 h-20"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500 text-center">
                  请从左侧选择一个 SOP 进行编辑
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            {/* 创建新规则 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="font-semibold mb-3">新建匹配规则</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">规则 ID</div>
                  <input
                    value={newRule.ruleId}
                    onChange={(e) => setNewRule((p) => ({ ...p, ruleId: e.target.value }))}
                    placeholder="如 rule_pre_trust_01"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">关联 SOP</div>
                  <select
                    value={newRule.sopId}
                    onChange={(e) => setNewRule((p) => ({ ...p, sopId: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">选择 SOP</option>
                    {sops.map((sop) => (
                      <option key={sop.sopId} value={sop.sopId}>
                        {sop.sopName} ({sop.sopStage})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">匹配阶段</div>
                  <select
                    value={newRule.requiredStage}
                    onChange={(e) => setNewRule((p) => ({ ...p, requiredStage: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {stageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">置信度 (0-100)</div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRule.confidence}
                    onChange={(e) => setNewRule((p) => ({ ...p, confidence: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">必须包含的标签（每行一个）</div>
                  <textarea
                    value={newRule.requiredTags}
                    onChange={(e) => setNewRule((p) => ({ ...p, requiredTags: e.target.value }))}
                    placeholder="image:rule_executor&#10;stability:low"
                    className="w-full border rounded px-3 py-2 text-sm h-20"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">排除的标签（每行一个）</div>
                  <textarea
                    value={newRule.excludedTags}
                    onChange={(e) => setNewRule((p) => ({ ...p, excludedTags: e.target.value }))}
                    placeholder="coach:high_value"
                    className="w-full border rounded px-3 py-2 text-sm h-20"
                  />
                </div>
              </div>
              <button
                onClick={() => void createRule()}
                disabled={creatingRule || !newRule.ruleId.trim() || !newRule.sopId}
                className="mt-3 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 text-sm"
              >
                {creatingRule ? "创建中..." : "创建规则"}
              </button>
            </div>

            {/* 规则筛选 */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">筛选 SOP：</span>
              <select
                value={filterSopId}
                onChange={(e) => setFilterSopId(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">全部</option>
                {sops.map((sop) => (
                  <option key={sop.sopId} value={sop.sopId}>
                    {sop.sopName} ({sop.ruleCount})
                  </option>
                ))}
              </select>
            </div>

            {/* 规则列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left border-b">
                    <th className="py-3 px-4">规则 ID</th>
                    <th className="py-3 px-4">关联 SOP</th>
                    <th className="py-3 px-4">匹配阶段</th>
                    <th className="py-3 px-4">必须标签</th>
                    <th className="py-3 px-4">排除标签</th>
                    <th className="py-3 px-4">置信度</th>
                    <th className="py-3 px-4">状态</th>
                    <th className="py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => {
                    const isEditing = editingRuleId === rule.ruleId;
                    return (
                      <tr key={rule.ruleId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{rule.ruleId}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{rule.sop.sopName}</div>
                          <div className="text-xs text-gray-500">{rule.sop.sopStage}</div>
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={ruleDraft.requiredStage || "pre"}
                              onChange={(e) => setRuleDraft((p) => ({ ...p, requiredStage: e.target.value }))}
                              className="border rounded px-2 py-1 text-sm w-24"
                            >
                              {stageOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.value}</option>
                              ))}
                            </select>
                          ) : (
                            rule.requiredStage || "-"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <textarea
                              value={ruleDraft.requiredTags || ""}
                              onChange={(e) => setRuleDraft((p) => ({ ...p, requiredTags: e.target.value }))}
                              className="border rounded px-2 py-1 text-xs w-40 h-16"
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {rule.requiredTags.map((tag) => (
                                <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                              {!rule.requiredTags.length && <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <textarea
                              value={ruleDraft.excludedTags || ""}
                              onChange={(e) => setRuleDraft((p) => ({ ...p, excludedTags: e.target.value }))}
                              className="border rounded px-2 py-1 text-xs w-40 h-16"
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {rule.excludedTags.map((tag) => (
                                <span key={tag} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                              {!rule.excludedTags.length && <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={ruleDraft.confidence || "0"}
                              onChange={(e) => setRuleDraft((p) => ({ ...p, confidence: e.target.value }))}
                              className="border rounded px-2 py-1 text-sm w-16"
                            />
                          ) : (
                            rule.confidence
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={ruleDraft.status || "active"}
                              onChange={(e) => setRuleDraft((p) => ({ ...p, status: e.target.value }))}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="active">active</option>
                              <option value="inactive">inactive</option>
                            </select>
                          ) : (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              rule.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {rule.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => { setEditingRuleId(null); setRuleDraft({}); }}
                                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => void saveRule()}
                                  disabled={savingRule}
                                  className="px-2 py-1 rounded bg-blue-600 text-white text-xs disabled:opacity-50"
                                >
                                  保存
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditRule(rule)}
                                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => void deleteRule(rule)}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                                >
                                  删除
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredRules.length && (
                <div className="text-sm text-gray-500 text-center py-8">
                  {filterSopId ? "该 SOP 暂无规则" : "暂无规则"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
