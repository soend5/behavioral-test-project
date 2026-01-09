"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../_components/AdminNav";
import { csrfFetch } from "@/lib/csrf-client";

type QuestionRow = {
  id: string;
  quizId: string;
  quiz: { id: string; version: string; quizVersion: string; title: string };
  stableId?: string;
  orderNo: number;
  stem: string;
  status: string;
  optionCount: number;
  createdAt: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function QuestionsClient() {
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizId, setQuizId] = useState("");

  const [creating, setCreating] = useState(false);
  const [newQuizId, setNewQuizId] = useState("");
  const [newOrderNo, setNewOrderNo] = useState("");
  const [newStableId, setNewStableId] = useState("");
  const [newStem, setNewStem] = useState("");
  const [newStatus, setNewStatus] = useState("active");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ orderNo: string; stem: string; status: string }>({
    orderNo: "",
    stem: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load(currentQuizId: string) {
    setLoading(true);
    setError(null);
    try {
      const url = currentQuizId
        ? `/api/admin/questions?quiz_id=${encodeURIComponent(currentQuizId)}`
        : "/api/admin/questions";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{ questions: QuestionRow[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setQuestions([]);
        return;
      }
      setQuestions(Array.isArray(json.data.questions) ? json.data.questions : []);
    } catch {
      setError("加载失败");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const qpQuizId = searchParams.get("quiz_id") || "";
    if (qpQuizId && !quizId) {
      setQuizId(qpQuizId);
      setNewQuizId(qpQuizId);
      void load(qpQuizId);
      return;
    }
    void load(quizId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, searchParams]);

  function startEdit(q: QuestionRow) {
    setEditingId(q.id);
    setEditDraft({ orderNo: String(q.orderNo), stem: q.stem, status: q.status });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/questions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: editDraft.orderNo,
          stem: editDraft.stem,
          status: editDraft.status,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ question: QuestionRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingId(null);
      await load(quizId);
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(q: QuestionRow) {
    const input = window.prompt(
      `将删除题目（${q.quiz.quizVersion}/${q.quiz.version} #${q.orderNo}）。如确认请输入：确认删除`
    );
    if (input !== "确认删除") return;

    setDeleting(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/questions/${q.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ question: QuestionRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load(quizId);
    } catch {
      setError("删除失败");
    } finally {
      setDeleting(false);
    }
  }

  async function createQuestion(e: FormEvent) {
    e.preventDefault();
    const quizIdValue = (newQuizId || quizId).trim();
    if (!quizIdValue) return;
    if (!newOrderNo.trim()) return;
    if (!newStem.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quizIdValue,
          orderNo: newOrderNo.trim(),
          stableId: newStableId.trim() || undefined,
          stem: newStem.trim(),
          status: newStatus,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ question: QuestionRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewOrderNo("");
      setNewStableId("");
      setNewStem("");
      await load(quizIdValue);
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
        <h1 className="text-2xl font-bold mb-4">题目管理</h1>
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="font-semibold mb-3">新建题目</div>
          <form onSubmit={createQuestion} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">quiz_id</div>
                <input
                  value={newQuizId}
                  onChange={(e) => setNewQuizId(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="从题库列表复制 quiz_id"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">状态</div>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">orderNo</div>
                <input
                  value={newOrderNo}
                  onChange={(e) => setNewOrderNo(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="例如 1"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">stableId（可选）</div>
                <input
                  value={newStableId}
                  onChange={(e) => setNewStableId(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="例如 fast_01"
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">stem</div>
              <textarea
                value={newStem}
                onChange={(e) => setNewStem(e.target.value)}
                className="border rounded px-3 py-2 w-full h-24"
                placeholder="题干"
              />
            </div>

            <button
              type="submit"
              disabled={
                creating ||
                !(newQuizId || quizId).trim() ||
                !newOrderNo.trim() ||
                !newStem.trim()
              }
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建题目"}
            </button>
            <div className="text-xs text-gray-500">
              提示：建议通过 quizVersion 进行版本隔离，避免影响已使用中的邀请/测评。
            </div>
          </form>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="筛选 quiz_id"
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="border rounded px-3 py-2 w-full sm:w-[420px]"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">题库</th>
                <th className="py-2 pr-2">顺序</th>
                <th className="py-2 pr-2">题目</th>
                <th className="py-2 pr-2">状态</th>
                <th className="py-2 pr-2">选项数</th>
                <th className="py-2 pr-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const isEditing = editingId === q.id;
                return (
                  <tr key={q.id} className="border-b align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium">
                        {q.quiz.quizVersion}/{q.quiz.version}
                      </div>
                      <div className="text-xs text-gray-500">{q.quizId}</div>
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <input
                          value={editDraft.orderNo}
                          onChange={(e) =>
                            setEditDraft((p) => ({ ...p, orderNo: e.target.value }))
                          }
                          className="border rounded px-2 py-1 w-20"
                        />
                      ) : (
                        q.orderNo
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <textarea
                          value={editDraft.stem}
                          onChange={(e) =>
                            setEditDraft((p) => ({ ...p, stem: e.target.value }))
                          }
                          className="border rounded px-2 py-1 w-[520px] max-w-full h-20"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{q.stem}</div>
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
                        q.status
                      )}
                    </td>
                    <td className="py-2 pr-2">{q.optionCount}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft({ orderNo: "", stem: "", status: "active" });
                              }}
                              disabled={saving}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => void saveEdit()}
                              disabled={
                                saving || !editDraft.orderNo.trim() || !editDraft.stem.trim()
                              }
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
                              href={`/admin/options?question_id=${encodeURIComponent(q.id)}`}
                              className="px-3 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50"
                            >
                              选项管理
                            </Link>
                            <button
                              onClick={() => void deleteQuestion(q)}
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
