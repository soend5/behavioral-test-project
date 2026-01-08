"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminNav } from "../_components/AdminNav";

type ArchetypeItem = {
  id: string;
  key: string;
  titleCn: string;
  oneLinerCn: string;
  traitsCn: unknown;
  risksCn: unknown;
  coachGuidanceCn: unknown;
  status: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string") as string[];
}

export default function AdminArchetypesPage() {
  const [version] = useState("v1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArchetypeItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [deleting, setDeleting] = useState(false);

  const selected = useMemo(
    () => items.find((i) => i.id === editingId) || null,
    [items, editingId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/archetypes?version=${encodeURIComponent(version)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<{ items: ArchetypeItem[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setItems([]);
        return;
      }
      setItems(json.data.items);
    } catch {
      setError("加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  function startEdit(item: ArchetypeItem) {
    setEditingId(item.id);
    setDraft({
      titleCn: item.titleCn,
      oneLinerCn: item.oneLinerCn,
      traitsCn: asStringArray(item.traitsCn).join("\n"),
      risksCn: asStringArray(item.risksCn).join("\n"),
      coachGuidanceCn: asStringArray(item.coachGuidanceCn).join("\n"),
      status: item.status,
    });
  }

  async function save() {
    if (!editingId) return;
    setError(null);
    try {
      const payload = {
        titleCn: String(draft.titleCn || "").trim(),
        oneLinerCn: String(draft.oneLinerCn || "").trim(),
        traitsCn: String(draft.traitsCn || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        risksCn: String(draft.risksCn || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        coachGuidanceCn: String(draft.coachGuidanceCn || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        status: String(draft.status || "active").trim() || "active",
      };

      const res = await fetch(`/api/admin/archetypes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingId(null);
      setDraft({});
      await load();
    } catch {
      setError("保存失败");
    }
  }

  async function deleteArchetype() {
    if (!editingId || !selected) return;
    const input = window.prompt(`将删除画像「${selected.titleCn}」。如确认请输入：确认删除`);
    if (input !== "确认删除") return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/archetypes/${editingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingId(null);
      setDraft({});
      await load();
    } catch {
      setError("删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">画像文案</h1>
          <div className="text-sm text-gray-500">版本：{version}</div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => startEdit(item)}
                  className={`w-full text-left bg-white rounded-lg shadow p-4 border ${
                    editingId === item.id ? "border-blue-600" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{item.titleCn}</div>
                    <div className="text-xs text-gray-500">{item.key}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2 line-clamp-3">
                    {item.oneLinerCn}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    状态：{item.status}
                  </div>
                </button>
              ))}
              {!items.length ? (
                <div className="text-sm text-gray-500">暂无数据</div>
              ) : null}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500">{selected.key}</div>
                      <div className="text-xl font-semibold">{selected.titleCn}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void deleteArchetype()}
                        disabled={deleting}
                        className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setDraft({});
                        }}
                        className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => void save()}
                        disabled={deleting}
                        className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                      >
                        保存
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-1">标题</div>
                      <input
                        value={draft.titleCn || ""}
                        onChange={(e) =>
                          setDraft((p: any) => ({ ...p, titleCn: e.target.value }))
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">一句话</div>
                      <textarea
                        value={draft.oneLinerCn || ""}
                        onChange={(e) =>
                          setDraft((p: any) => ({ ...p, oneLinerCn: e.target.value }))
                        }
                        className="w-full border rounded px-3 py-2 h-20"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">特征（每行一条）</div>
                        <textarea
                          value={draft.traitsCn || ""}
                          onChange={(e) =>
                            setDraft((p: any) => ({ ...p, traitsCn: e.target.value }))
                          }
                          className="w-full border rounded px-3 py-2 h-40"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">风险（每行一条）</div>
                        <textarea
                          value={draft.risksCn || ""}
                          onChange={(e) =>
                            setDraft((p: any) => ({ ...p, risksCn: e.target.value }))
                          }
                          className="w-full border rounded px-3 py-2 h-40"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">
                        助教建议（每行一条）
                      </div>
                      <textarea
                        value={draft.coachGuidanceCn || ""}
                        onChange={(e) =>
                          setDraft((p: any) => ({
                            ...p,
                            coachGuidanceCn: e.target.value,
                          }))
                        }
                        className="w-full border rounded px-3 py-2 h-40"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">status</div>
                      <select
                        value={draft.status || "active"}
                        onChange={(e) =>
                          setDraft((p: any) => ({ ...p, status: e.target.value }))
                        }
                        className="border rounded px-3 py-2"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="deleted">deleted</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
                  请选择一个画像进行编辑
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
