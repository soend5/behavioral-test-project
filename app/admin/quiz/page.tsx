"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo, type FormEvent } from "react";
import { AdminNav } from "../_components/AdminNav";
import { csrfFetch } from "@/lib/csrf-client";

export default function AdminQuizPage() {
  type QuizRow = {
    id: string;
    version: "fast" | "pro" | string;
    quizVersion: string;
    title: string;
    status: string;
    questionCount: number;
    createdAt: string;
  };

  type SettingsData = {
    inviteDefaultQuizVersion: string;
    availableQuizVersions: string[];
  };

  type ApiOk<T> = { ok: true; data: T };
  type ApiFail = { ok: false; error: { code: string; message: string } };
  type ApiResponse<T> = ApiOk<T> | ApiFail;

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 默认版本配置状态
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [defaultQuizVersion, setDefaultQuizVersion] = useState("v1");
  const [savingSettings, setSavingSettings] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newVersion, setNewVersion] = useState<"fast" | "pro">("fast");
  const [newQuizVersion, setNewQuizVersion] = useState("v2");
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("active");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; status: string }>({
    title: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const availableVersions = useMemo(
    () => settingsData?.availableQuizVersions || [],
    [settingsData]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 并行加载题库列表和设置
      const [quizRes, settingsRes] = await Promise.all([
        fetch("/api/admin/quiz", { cache: "no-store" }),
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);

      const quizJson = (await quizRes.json()) as ApiResponse<{ quizzes: QuizRow[] }>;
      const settingsJson = (await settingsRes.json()) as ApiResponse<SettingsData>;

      if (!quizJson.ok) {
        setError(quizJson.error.message);
        setQuizzes([]);
      } else {
        setQuizzes(Array.isArray(quizJson.data.quizzes) ? quizJson.data.quizzes : []);
      }

      if (settingsJson.ok) {
        setSettingsData(settingsJson.data);
        setDefaultQuizVersion(settingsJson.data.inviteDefaultQuizVersion || "v1");
      }
    } catch {
      setError("加载失败");
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDefaultVersion() {
    setSavingSettings(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteDefaultQuizVersion: defaultQuizVersion }),
      });
      const json = (await res.json()) as ApiResponse<{ updatedAt: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSavingSettings(false);
    }
  }

  function startEdit(q: QuizRow) {
    setEditingId(q.id);
    setEditDraft({ title: q.title, status: q.status });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/quiz/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title.trim(),
          status: editDraft.status,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ quiz: QuizRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(q: QuizRow) {
    const input = window.prompt(
      `将删除题库（${q.version}/${q.quizVersion}）。如确认请输入：确认删除`
    );
    if (input !== "确认删除") return;

    setDeleting(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/quiz/${q.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ quiz: QuizRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("删除失败");
    } finally {
      setDeleting(false);
    }
  }

  async function createQuiz(e: FormEvent) {
    e.preventDefault();
    if (!newQuizVersion.trim() || !newTitle.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: newVersion,
          quizVersion: newQuizVersion.trim(),
          title: newTitle.trim(),
          status: newStatus,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ quiz: QuizRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewTitle("");
      await load();
    } catch {
      setError("创建失败");
    } finally {
      setCreating(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto p-4">加载中...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2">题库管理</h1>
        <p className="text-sm text-gray-500 mb-4">
          支持对题库、题目、选项进行编辑与停用；建议通过 quizVersion 进行版本隔离。
        </p>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        {/* V1.3: 默认题库版本配置 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium text-blue-900 mb-1">
                助教创建邀请：默认题库版本
              </div>
              <div className="text-xs text-blue-700 mb-2">
                该配置会作为助教端「新建邀请」的默认值
              </div>
              {availableVersions.length ? (
                <select
                  value={defaultQuizVersion}
                  onChange={(e) => setDefaultQuizVersion(e.target.value)}
                  className="border rounded px-3 py-2 w-full max-w-xs bg-white"
                  disabled={savingSettings}
                >
                  {availableVersions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={defaultQuizVersion}
                  onChange={(e) => setDefaultQuizVersion(e.target.value)}
                  className="border rounded px-3 py-2 w-full max-w-xs"
                  placeholder="例如 v1"
                  disabled={savingSettings}
                />
              )}
            </div>
            <button
              onClick={() => void saveDefaultVersion()}
              disabled={savingSettings || !defaultQuizVersion.trim()}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {savingSettings ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="font-semibold mb-3">新建题库</div>
          <form onSubmit={createQuiz} className="flex flex-wrap gap-3 items-end">
            <div>
              <div className="text-xs text-gray-500 mb-1">类型</div>
              <select
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value as "fast" | "pro")}
                className="border rounded px-3 py-2"
              >
                <option value="fast">fast（9 题）</option>
                <option value="pro">pro（18 题）</option>
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="text-xs text-gray-500 mb-1">题库版本（quizVersion）</div>
              <input
                value={newQuizVersion}
                onChange={(e) => setNewQuizVersion(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="例如 v2"
              />
            </div>
            <div className="flex-1 min-w-[260px]">
              <div className="text-xs text-gray-500 mb-1">标题</div>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="例如 快速测评（v2）"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !newQuizVersion.trim() || !newTitle.trim()}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建"}
            </button>
          </form>
          <div className="mt-3 text-xs text-gray-500">
            提示：题目/选项的增删改请在「题目管理 / 选项管理」中进行。
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">版本</th>
                <th className="py-2 pr-2">题库版本</th>
                <th className="py-2 pr-2">标题</th>
                <th className="py-2 pr-2">状态</th>
                <th className="py-2 pr-2">题目数</th>
                <th className="py-2 pr-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => {
                const isEditing = editingId === q.id;
                const isDefault = q.quizVersion === defaultQuizVersion;
                return (
                  <tr key={q.id} className={`border-b ${isDefault ? "bg-blue-50/50" : ""}`}>
                    <td className="py-2 pr-2">{q.version}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.quizVersion}</span>
                        {isDefault && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                            默认
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{q.id}</div>
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <input
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft((p) => ({ ...p, title: e.target.value }))
                          }
                          className="border rounded px-2 py-1 w-[320px] max-w-full"
                        />
                      ) : (
                        <div>{q.title}</div>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <select
                          value={editDraft.status}
                          onChange={(e) =>
                            setEditDraft((p) => ({ ...p, status: e.target.value }))
                          }
                          className="border rounded px-2 py-1"
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                          <option value="deleted">deleted</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs border ${
                            q.status === "active"
                              ? "bg-green-50 border-green-200 text-green-800"
                              : q.status === "deleted"
                                ? "bg-red-50 border-red-200 text-red-800"
                                : "bg-gray-50 border-gray-200 text-gray-700"
                          }`}
                        >
                          {q.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2">{q.questionCount}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft({ title: "", status: "active" });
                              }}
                              disabled={saving}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => void saveEdit()}
                              disabled={saving || !editDraft.title.trim()}
                              className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                            >
                              保存
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(q)}
                              disabled={saving || deleting}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              编辑
                            </button>
                            <Link
                              href={`/admin/questions?quiz_id=${encodeURIComponent(q.id)}`}
                              className="px-3 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50"
                            >
                              题目管理
                            </Link>
                            <button
                              onClick={() => void deleteQuiz(q)}
                              disabled={deleting}
                              className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
}
