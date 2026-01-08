"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../_components/AdminNav";

type OptionRow = {
  id: string;
  questionId: string;
  question: {
    id: string;
    stem: string;
    quiz: { id: string; version: string; quizVersion: string };
  };
  stableId?: string;
  orderNo: number;
  text: string;
  scorePayloadJson: unknown | null;
  createdAt: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function OptionsClient() {
  const searchParams = useSearchParams();

  const [options, setOptions] = useState<OptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [questionId, setQuestionId] = useState("");

  const [creating, setCreating] = useState(false);
  const [newQuestionId, setNewQuestionId] = useState("");
  const [newOrderNo, setNewOrderNo] = useState("");
  const [newStableId, setNewStableId] = useState("");
  const [newText, setNewText] = useState("");
  const [newScorePayload, setNewScorePayload] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    orderNo: string;
    text: string;
    scorePayloadJson: string;
  }>({ orderNo: "", text: "", scorePayloadJson: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load(currentQuestionId: string) {
    setLoading(true);
    setError(null);
    try {
      const url = currentQuestionId
        ? `/api/admin/options?question_id=${encodeURIComponent(currentQuestionId)}`
        : "/api/admin/options";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{ options: OptionRow[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setOptions([]);
        return;
      }
      setOptions(Array.isArray(json.data.options) ? json.data.options : []);
    } catch {
      setError("加载失败");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const qpQuestionId = searchParams.get("question_id") || "";
    if (qpQuestionId && !questionId) {
      setQuestionId(qpQuestionId);
      setNewQuestionId(qpQuestionId);
      void load(qpQuestionId);
      return;
    }
    void load(questionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, searchParams]);

  function startEdit(opt: OptionRow) {
    setEditingId(opt.id);
    setEditDraft({
      orderNo: String(opt.orderNo),
      text: opt.text,
      scorePayloadJson:
        opt.scorePayloadJson === null || opt.scorePayloadJson === undefined
          ? ""
          : JSON.stringify(opt.scorePayloadJson, null, 2),
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        orderNo: editDraft.orderNo,
        text: editDraft.text,
      };
      const trimmed = editDraft.scorePayloadJson.trim();
      payload.scorePayloadJson = trimmed ? trimmed : null;

      const res = await fetch(`/api/admin/options/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ option: OptionRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setEditingId(null);
      await load(questionId);
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOption(opt: OptionRow) {
    const input = window.prompt(
      `将删除选项（${opt.question.quiz.quizVersion}/${opt.question.quiz.version} #${opt.orderNo}）。如确认请输入：确认删除`
    );
    if (input !== "确认删除") return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/options/${opt.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: input }),
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean; id: string }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load(questionId);
    } catch {
      setError("删除失败");
    } finally {
      setDeleting(false);
    }
  }

  async function createOption(e: FormEvent) {
    e.preventDefault();
    const questionIdValue = (newQuestionId || questionId).trim();
    if (!questionIdValue) return;
    if (!newOrderNo.trim()) return;
    if (!newText.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        questionId: questionIdValue,
        orderNo: newOrderNo.trim(),
        text: newText.trim(),
      };
      if (newStableId.trim()) payload.stableId = newStableId.trim();
      if (newScorePayload.trim()) payload.scorePayloadJson = newScorePayload.trim();

      const res = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ option: OptionRow }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewOrderNo("");
      setNewStableId("");
      setNewText("");
      setNewScorePayload("");
      await load(questionIdValue);
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
        <h1 className="text-2xl font-bold mb-4">选项管理</h1>
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="font-semibold mb-3">新建选项</div>
          <form onSubmit={createOption} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">question_id</div>
                <input
                  value={newQuestionId}
                  onChange={(e) => setNewQuestionId(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="从题目列表复制 question_id"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">orderNo</div>
                <input
                  value={newOrderNo}
                  onChange={(e) => setNewOrderNo(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="例如 1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">stableId（可选）</div>
                <input
                  value={newStableId}
                  onChange={(e) => setNewStableId(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="例如 A"
                />
              </div>
              <div className="md:col-span-1">
                <div className="text-xs text-gray-500 mb-1">text</div>
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="选项文本"
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">scorePayloadJson（可选，JSON 对象）</div>
              <textarea
                value={newScorePayload}
                onChange={(e) => setNewScorePayload(e.target.value)}
                className="border rounded px-3 py-2 w-full h-32 font-mono text-xs"
                placeholder='例如 {"archetype_vote":"rule_executor","dimension_delta":{"rule_dependence":2,"emotion_involvement":0,"experience_reliance":0,"opportunity_sensitivity":0,"risk_defense":0,"action_consistency":0},"tags":["image:rule_executor","rule:high"]}'
              />
            </div>

            <button
              type="submit"
              disabled={
                creating ||
                !(newQuestionId || questionId).trim() ||
                !newOrderNo.trim() ||
                !newText.trim()
              }
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建选项"}
            </button>
            <div className="text-xs text-gray-500">
              提示：建议通过 quizVersion 进行版本隔离，避免影响已使用中的邀请/测评。
            </div>
          </form>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="筛选 question_id"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            className="border rounded px-3 py-2 w-full sm:w-[420px]"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">题库</th>
                <th className="py-2 pr-2">顺序</th>
                <th className="py-2 pr-2">选项文本</th>
                <th className="py-2 pr-2">题目</th>
                <th className="py-2 pr-2">scorePayload</th>
                <th className="py-2 pr-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => {
                const isEditing = editingId === opt.id;
                return (
                  <tr key={opt.id} className="border-b align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium">
                        {opt.question.quiz.quizVersion}/{opt.question.quiz.version}
                      </div>
                      <div className="text-xs text-gray-500">{opt.questionId}</div>
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
                        opt.orderNo
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <input
                          value={editDraft.text}
                          onChange={(e) =>
                            setEditDraft((p) => ({ ...p, text: e.target.value }))
                          }
                          className="border rounded px-2 py-1 w-[320px] max-w-full"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{opt.text}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">id: {opt.id}</div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="whitespace-pre-wrap">{opt.question.stem}</div>
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <textarea
                          value={editDraft.scorePayloadJson}
                          onChange={(e) =>
                            setEditDraft((p) => ({ ...p, scorePayloadJson: e.target.value }))
                          }
                          className="border rounded px-2 py-1 w-[360px] max-w-full h-28 font-mono text-xs"
                        />
                      ) : (
                        <pre className="text-xs bg-gray-50 border rounded p-2 w-[360px] max-w-full overflow-auto">
                          {opt.scorePayloadJson
                            ? JSON.stringify(opt.scorePayloadJson, null, 2)
                            : "null"}
                        </pre>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft({ orderNo: "", text: "", scorePayloadJson: "" });
                              }}
                              disabled={saving}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => void saveEdit()}
                              disabled={
                                saving || !editDraft.orderNo.trim() || !editDraft.text.trim()
                              }
                              className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                            >
                              保存
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(opt)}
                              disabled={saving || deleting}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => void deleteOption(opt)}
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
