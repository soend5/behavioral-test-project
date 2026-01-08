"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminNav } from "../_components/AdminNav";

type TrainingSection = {
  id: string;
  orderNo: number;
  titleCn: string;
  bulletsCn: unknown;
};

type TrainingDay = {
  id: string;
  dayNo: number;
  titleCn: string;
  goalCn: string;
  doListCn: unknown;
  dontListCn: unknown;
  sections: TrainingSection[];
};

type TrainingHandbook = {
  id: string;
  version: string;
  status: string;
  days: TrainingDay[];
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string") as string[];
}

export default function AdminTrainingHandbookPage() {
  const [version] = useState("v1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handbook, setHandbook] = useState<TrainingHandbook | null>(null);
  const [handbookStatusDraft, setHandbookStatusDraft] = useState("active");
  const [savingHandbook, setSavingHandbook] = useState(false);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const selectedDay = useMemo(() => {
    if (!handbook) return null;
    return handbook.days.find((d) => d.id === selectedDayId) || handbook.days[0] || null;
  }, [handbook, selectedDayId]);

  const [dayDraft, setDayDraft] = useState<Record<string, any>>({});
  const [editingDay, setEditingDay] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/training-handbook?version=${encodeURIComponent(version)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<{ handbook: TrainingHandbook | null }>;
      if (!json.ok) {
        setError(json.error.message);
        setHandbook(null);
        return;
      }
      setHandbook(json.data.handbook);
      const firstDay = json.data.handbook?.days?.[0] || null;
      setSelectedDayId((prev) => prev || firstDay?.id || null);
    } catch {
      setError("加载失败");
      setHandbook(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    setHandbookStatusDraft(handbook?.status || "active");
  }, [handbook]);

  useEffect(() => {
    if (!selectedDay) return;
    setEditingDay(false);
    setDayDraft({
      titleCn: selectedDay.titleCn,
      goalCn: selectedDay.goalCn,
      doListCn: asStringArray(selectedDay.doListCn).join("\n"),
      dontListCn: asStringArray(selectedDay.dontListCn).join("\n"),
    });
  }, [selectedDayId, selectedDay]);

  async function saveDay() {
    if (!selectedDay) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        titleCn: String(dayDraft.titleCn || "").trim(),
        goalCn: String(dayDraft.goalCn || "").trim(),
        doListCn: String(dayDraft.doListCn || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        dontListCn: String(dayDraft.dontListCn || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await fetch(`/api/admin/training-handbook/days/${selectedDay.id}`, {
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
      setEditingDay(false);
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveHandbookStatus() {
    if (!handbook) return;
    setSavingHandbook(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/training-handbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, status: handbookStatusDraft }),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSavingHandbook(false);
    }
  }

  async function deleteHandbook() {
    if (!handbook) return;
    const input = window.prompt(`将删除内训手册（version=${version}）。如确认请输入：确认删除`);
    if (input !== "确认删除") return;

    setSavingHandbook(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/training-handbook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("删除失败");
    } finally {
      setSavingHandbook(false);
    }
  }

  async function deleteDay(day: TrainingDay) {
    const input = window.prompt(
      `将删除第 ${day.dayNo} 天（含其所有章节）。如确认请输入：确认删除`
    );
    if (input !== "确认删除") return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/training-handbook/days/${day.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean; id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      if (selectedDayId === day.id) {
        setSelectedDayId(null);
      }
      await load();
    } catch {
      setError("删除失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection(section: TrainingSection) {
    const input = window.prompt(
      `将删除章节「${section.orderNo}. ${section.titleCn}」。如确认请输入：确认删除`
    );
    if (input !== "确认删除") return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/training-handbook/sections/${section.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean; id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("删除失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveSection(sectionId: string, payload: { titleCn: string; bulletsCn: string[] }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/training-handbook/sections/${sectionId}`, {
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

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<Record<string, any>>({});

  function startEditSection(section: TrainingSection) {
    setEditingSectionId(section.id);
    setSectionDraft({
      titleCn: section.titleCn,
      bulletsCn: asStringArray(section.bulletsCn).join("\n"),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">内训手册</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>版本：{version}</span>
            {handbook ? (
              <>
                <span className="text-gray-300">|</span>
                <span>状态：</span>
                <select
                  value={handbookStatusDraft}
                  onChange={(e) => setHandbookStatusDraft(e.target.value)}
                  className="border rounded px-2 py-1 bg-white"
                  disabled={savingHandbook}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="deleted">deleted</option>
                </select>
                <button
                  onClick={() => void saveHandbookStatus()}
                  disabled={savingHandbook || !handbook}
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  保存状态
                </button>
                <button
                  onClick={() => void deleteHandbook()}
                  disabled={savingHandbook || !handbook}
                  className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                >
                  删除手册
                </button>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">加载中...</div>
        ) : !handbook ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">
            未找到数据（可能尚未运行 seed）
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4 space-y-2">
              <div className="font-semibold mb-2">训练日</div>
              {handbook.days.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDayId(d.id)}
                  className={`w-full text-left border rounded p-3 ${
                    selectedDay?.id === d.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <div className="text-sm text-gray-500">第 {d.dayNo} 天</div>
                  <div className="font-medium">{d.titleCn}</div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {selectedDay ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500">第 {selectedDay.dayNo} 天</div>
                      <div className="text-xl font-semibold">{selectedDay.titleCn}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void deleteDay(selectedDay)}
                        disabled={saving}
                        className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                      >
                        删除 Day
                      </button>
                      {editingDay ? (
                        <>
                          <button
                            onClick={() => setEditingDay(false)}
                            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => void saveDay()}
                            disabled={saving}
                            className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                          >
                            保存
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingDay(true)}
                          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                        >
                          编辑 Day
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-1">标题</div>
                      {editingDay ? (
                        <input
                          value={dayDraft.titleCn || ""}
                          onChange={(e) =>
                            setDayDraft((p: any) => ({ ...p, titleCn: e.target.value }))
                          }
                          className="w-full border rounded px-3 py-2"
                        />
                      ) : (
                        <div className="text-gray-800">{selectedDay.titleCn}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-1">目标</div>
                      {editingDay ? (
                        <textarea
                          value={dayDraft.goalCn || ""}
                          onChange={(e) =>
                            setDayDraft((p: any) => ({ ...p, goalCn: e.target.value }))
                          }
                          className="w-full border rounded px-3 py-2 h-20"
                        />
                      ) : (
                        <div className="text-gray-800">{selectedDay.goalCn}</div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Do（每行一条）</div>
                        {editingDay ? (
                          <textarea
                            value={dayDraft.doListCn || ""}
                            onChange={(e) =>
                              setDayDraft((p: any) => ({ ...p, doListCn: e.target.value }))
                            }
                            className="w-full border rounded px-3 py-2 h-32"
                          />
                        ) : (
                          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                            {asStringArray(selectedDay.doListCn).map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Don&apos;t（每行一条）</div>
                        {editingDay ? (
                          <textarea
                            value={dayDraft.dontListCn || ""}
                            onChange={(e) =>
                              setDayDraft((p: any) => ({ ...p, dontListCn: e.target.value }))
                            }
                            className="w-full border rounded px-3 py-2 h-32"
                          />
                        ) : (
                          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                            {asStringArray(selectedDay.dontListCn).map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedDay ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-lg font-semibold mb-3">章节内容</div>
                  <div className="space-y-4">
                    {selectedDay.sections.map((s) => {
                      const isEditing = editingSectionId === s.id;
                      return (
                        <div key={s.id} className="border rounded p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">
                              {s.orderNo}. {s.titleCn}
                            </div>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSectionId(null);
                                    setSectionDraft({});
                                  }}
                                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => {
                                    const payload = {
                                      titleCn: String(sectionDraft.titleCn || "").trim(),
                                      bulletsCn: String(sectionDraft.bulletsCn || "")
                                        .split("\n")
                                        .map((x) => x.trim())
                                        .filter(Boolean),
                                    };
                                    void saveSection(s.id, payload);
                                    setEditingSectionId(null);
                                    setSectionDraft({});
                                  }}
                                  disabled={saving}
                                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                                >
                                  保存
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditSection(s)}
                                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => void deleteSection(s)}
                                  disabled={saving}
                                  className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  value={sectionDraft.titleCn || ""}
                                  onChange={(e) =>
                                    setSectionDraft((p: any) => ({
                                      ...p,
                                      titleCn: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded px-3 py-2"
                                />
                                <textarea
                                  value={sectionDraft.bulletsCn || ""}
                                  onChange={(e) =>
                                    setSectionDraft((p: any) => ({
                                      ...p,
                                      bulletsCn: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded px-3 py-2 h-32"
                                />
                              </div>
                            ) : (
                              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                                {asStringArray(s.bulletsCn).map((b) => (
                                  <li key={b}>{b}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
