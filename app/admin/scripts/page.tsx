"use client";

import { useState, useEffect, useMemo } from "react";
import { AdminNav } from "../_components/AdminNav";
import { csrfFetch } from "@/lib/csrf-client";

type ScriptTemplate = {
  id: string;
  name: string;
  category: string;
  triggerStage: string | null;
  triggerArchetype: string | null;
  triggerTags: string[];
  content: string;
  variables: string[];
  status: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

const CATEGORY_OPTIONS = [
  { value: "首次沟通", label: "首次沟通" },
  { value: "跟进", label: "跟进" },
  { value: "转化", label: "转化" },
  { value: "复测", label: "复测" },
];

const STAGE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "pre", label: "pre（认知建立期）" },
  { value: "mid", label: "mid（行动推进期）" },
  { value: "post", label: "post（成果巩固期）" },
];

const ARCHETYPE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "rule_executor", label: "规则执行型" },
  { value: "impulsive_reactor", label: "冲动反应型" },
  { value: "hesitant_observer", label: "犹豫观望型" },
  { value: "overconfident_trader", label: "过度自信型" },
  { value: "loss_averse_holder", label: "损失厌恶型" },
  { value: "balanced_learner", label: "均衡学习型" },
];

export default function AdminScriptsPage() {
  const [scripts, setScripts] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Create state
  const [creating, setCreating] = useState(false);
  const [newScript, setNewScript] = useState({
    name: "",
    category: "首次沟通",
    triggerStage: "",
    triggerArchetype: "",
    triggerTags: "",
    content: "",
    variables: "",
  });

  const filteredScripts = useMemo(() => {
    return scripts.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterCategory && s.category !== filterCategory) return false;
      return true;
    });
  }, [scripts, filterStatus, filterCategory]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scripts?status=${filterStatus}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{ scripts: ScriptTemplate[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setScripts([]);
        return;
      }
      setScripts(json.data.scripts);
    } catch {
      setError("加载失败");
      setScripts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  function startEdit(script: ScriptTemplate) {
    setEditingId(script.id);
    setDraft({
      name: script.name,
      category: script.category,
      triggerStage: script.triggerStage || "",
      triggerArchetype: script.triggerArchetype || "",
      triggerTags: script.triggerTags.join("\n"),
      content: script.content,
      variables: script.variables.join("\n"),
      status: script.status,
    });
  }

  async function saveScript() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const triggerTags = draft.triggerTags.split("\n").map((s: string) => s.trim()).filter(Boolean);
      const variables = draft.variables.split("\n").map((s: string) => s.trim()).filter(Boolean);

      const res = await csrfFetch(`/api/admin/scripts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          category: draft.category,
          triggerStage: draft.triggerStage || null,
          triggerArchetype: draft.triggerArchetype || null,
          triggerTags: triggerTags.length ? triggerTags : null,
          content: draft.content,
          variables: variables.length ? variables : null,
          status: draft.status,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ script: ScriptTemplate }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingId(null);
      setDraft({});
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function createScript() {
    if (!newScript.name.trim() || !newScript.content.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const triggerTags = newScript.triggerTags.split("\n").map((s) => s.trim()).filter(Boolean);
      const variables = newScript.variables.split("\n").map((s) => s.trim()).filter(Boolean);

      const res = await csrfFetch("/api/admin/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newScript.name.trim(),
          category: newScript.category,
          triggerStage: newScript.triggerStage || null,
          triggerArchetype: newScript.triggerArchetype || null,
          triggerTags: triggerTags.length ? triggerTags : null,
          content: newScript.content.trim(),
          variables: variables.length ? variables : null,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ script: ScriptTemplate }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewScript({
        name: "",
        category: "首次沟通",
        triggerStage: "",
        triggerArchetype: "",
        triggerTags: "",
        content: "",
        variables: "",
      });
      await load();
    } catch {
      setError("创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function deleteScript(script: ScriptTemplate) {
    const input = window.prompt(`将删除话术「${script.name}」。如确认请输入：确认删除`);
    if (input !== "确认删除") return;
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/scripts/${script.id}`, { method: "DELETE" });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      if (editingId === script.id) {
        setEditingId(null);
        setDraft({});
      }
      await load();
    } catch {
      setError("删除失败");
    }
  }

  const selectedScript = useMemo(() => {
    return scripts.find((s) => s.id === editingId) || null;
  }, [scripts, editingId]);

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
        <h1 className="text-2xl font-bold mb-1">话术库管理</h1>
        <p className="text-sm text-gray-600 mb-4">
          管理助教话术模板，支持按阶段、画像、标签智能匹配推荐。
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：创建 + 列表 */}
          <div className="space-y-4">
            {/* 创建新话术 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="font-semibold mb-3">新建话术</div>
              <div className="space-y-2">
                <input
                  value={newScript.name}
                  onChange={(e) => setNewScript((p) => ({ ...p, name: e.target.value }))}
                  placeholder="话术名称（如：首次沟通-规则执行型）"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <select
                  value={newScript.category}
                  onChange={(e) => setNewScript((p) => ({ ...p, category: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <textarea
                  value={newScript.content}
                  onChange={(e) => setNewScript((p) => ({ ...p, content: e.target.value }))}
                  placeholder="话术内容（支持变量 {{customerName}}）"
                  className="w-full border rounded px-3 py-2 text-sm h-24"
                />
                <button
                  onClick={() => void createScript()}
                  disabled={creating || !newScript.name.trim() || !newScript.content.trim()}
                  className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 text-sm"
                >
                  {creating ? "创建中..." : "创建话术"}
                </button>
              </div>
            </div>

            {/* 筛选 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="font-semibold mb-3">筛选</div>
              <div className="space-y-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="active">仅显示启用</option>
                  <option value="">全部状态</option>
                  <option value="inactive">仅显示停用</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">全部分类</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 话术列表 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="font-semibold mb-3">话术列表 ({filteredScripts.length})</div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredScripts.map((script) => (
                  <button
                    key={script.id}
                    onClick={() => startEdit(script)}
                    className={`w-full text-left border rounded p-3 ${
                      editingId === script.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{script.name}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        script.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {script.status === "active" ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {script.category} · 使用 {script.usageCount} 次
                    </div>
                  </button>
                ))}
                {!filteredScripts.length && (
                  <div className="text-sm text-gray-500 text-center py-4">暂无话术</div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：编辑区 */}
          <div className="lg:col-span-2">
            {selectedScript ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-gray-500">ID: {selectedScript.id}</div>
                    <div className="text-xl font-semibold">{selectedScript.name}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void deleteScript(selectedScript)}
                      disabled={saving}
                      className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setDraft({}); }}
                      className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => void saveScript()}
                      disabled={saving}
                      className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">名称</div>
                    <input
                      value={draft.name || ""}
                      onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">分类</div>
                    <select
                      value={draft.category || "首次沟通"}
                      onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">触发阶段</div>
                    <select
                      value={draft.triggerStage || ""}
                      onChange={(e) => setDraft((p) => ({ ...p, triggerStage: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    >
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">触发画像</div>
                    <select
                      value={draft.triggerArchetype || ""}
                      onChange={(e) => setDraft((p) => ({ ...p, triggerArchetype: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    >
                      {ARCHETYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">状态</div>
                    <select
                      value={draft.status || "active"}
                      onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="active">启用</option>
                      <option value="inactive">停用</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">使用次数</div>
                    <div className="border rounded px-3 py-2 bg-gray-50 text-gray-600">
                      {selectedScript.usageCount} 次
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-1">话术内容</div>
                  <textarea
                    value={draft.content || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
                    placeholder="支持变量：{{customerName}}、{{archetype}}"
                    className="w-full border rounded px-3 py-2 h-32"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-sm font-medium mb-1">触发标签（每行一个）</div>
                    <textarea
                      value={draft.triggerTags || ""}
                      onChange={(e) => setDraft((p) => ({ ...p, triggerTags: e.target.value }))}
                      placeholder="image:rule_executor&#10;stability:low"
                      className="w-full border rounded px-3 py-2 h-24"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">变量列表（每行一个）</div>
                    <textarea
                      value={draft.variables || ""}
                      onChange={(e) => setDraft((p) => ({ ...p, variables: e.target.value }))}
                      placeholder="customerName&#10;archetype"
                      className="w-full border rounded px-3 py-2 h-24"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium mb-1">预览</div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {(draft.content || "").replace(/\{\{customerName\}\}/g, "张三").replace(/\{\{archetype\}\}/g, "规则执行型")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500 text-center">
                请从左侧选择一个话术进行编辑
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
