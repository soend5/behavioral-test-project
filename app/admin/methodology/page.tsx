"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminNav } from "../_components/AdminNav";

type MethodologySection = {
  id: string;
  slug: string;
  titleCn: string;
  contentMarkdown: string;
  orderNo: number;
};

type MethodologyDoc = {
  id: string;
  version: string;
  status: string;
  sections: MethodologySection[];
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function AdminMethodologyPage() {
  const [version] = useState("v1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<MethodologyDoc | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => {
    if (!doc) return null;
    return doc.sections.find((s) => s.id === selectedId) || doc.sections[0] || null;
  }, [doc, selectedId]);

  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/methodology?version=${encodeURIComponent(version)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<{ doc: MethodologyDoc | null }>;
      if (!json.ok) {
        setError(json.error.message);
        setDoc(null);
        return;
      }
      setDoc(json.data.doc);
      const first = json.data.doc?.sections?.[0] || null;
      setSelectedId((prev) => prev || first?.id || null);
    } catch {
      setError("加载失败");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      titleCn: selected.titleCn,
      contentMarkdown: selected.contentMarkdown,
    });
  }, [selected]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        titleCn: String(draft.titleCn || "").trim(),
        contentMarkdown: String(draft.contentMarkdown || "").trim(),
      };
      const res = await fetch(`/api/admin/methodology/sections/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        setSaving(false);
        return;
      }
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Methodology</h1>
          <div className="text-sm text-gray-500">version: {version}</div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">加载中...</div>
        ) : !doc ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">
            未找到数据（可能尚未运行 seed）
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4 space-y-2">
              <div className="font-semibold mb-2">Sections</div>
              {doc.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left border rounded p-3 ${
                    selected?.id === s.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <div className="text-xs text-gray-500">{s.slug}</div>
                  <div className="font-medium">{s.titleCn}</div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500">{selected.slug}</div>
                      <div className="text-xl font-semibold">{selected.titleCn}</div>
                    </div>
                    <button
                      onClick={() => void save()}
                      disabled={saving}
                      className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                    >
                      保存
                    </button>
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
                      <div className="text-sm font-medium mb-1">Markdown</div>
                      <textarea
                        value={draft.contentMarkdown || ""}
                        onChange={(e) =>
                          setDraft((p: any) => ({
                            ...p,
                            contentMarkdown: e.target.value,
                          }))
                        }
                        className="w-full border rounded px-3 py-2 h-[420px] font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
                  请选择一个章节
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
