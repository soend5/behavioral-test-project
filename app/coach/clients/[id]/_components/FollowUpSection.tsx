"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfFetch } from "@/lib/csrf-client";

type FollowUpLog = {
  id: string;
  customerId: string;
  coachId: string;
  type: "wechat" | "call" | "note";
  content: string;
  nextAction: string | null;
  nextDate: string | null;
  createdAt: string;
};

type Props = {
  customerId: string;
};

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  wechat: { label: "微信", icon: "💬" },
  call: { label: "电话", icon: "📞" },
  note: { label: "备注", icon: "📝" },
};

export function FollowUpSection({ customerId }: Props) {
  const [logs, setLogs] = useState<FollowUpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLog, setNewLog] = useState({
    type: "wechat" as "wechat" | "call" | "note",
    content: "",
    nextAction: "",
    nextDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coach/followup?customerId=${customerId}`);
      const json = await res.json();
      if (json.ok) {
        setLogs(json.data.logs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    if (!newLog.content.trim()) {
      setError("请输入沟通内容");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await csrfFetch("/api/coach/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          type: newLog.type,
          content: newLog.content.trim(),
          nextAction: newLog.nextAction.trim() || null,
          nextDate: newLog.nextDate || null,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "保存失败");
        return;
      }

      // Reset form and reload
      setNewLog({ type: "wechat", content: "", nextAction: "", nextDate: "" });
      await load();
    } catch {
      setError("保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">📝 跟进记录</h3>

      {/* New log form */}
      <div className="border rounded p-3 mb-4 bg-gray-50">
        <div className="flex gap-2 mb-2">
          {(["wechat", "call", "note"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setNewLog((p) => ({ ...p, type }))}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                newLog.type === type
                  ? "bg-blue-600 text-white"
                  : "bg-white border hover:bg-gray-100"
              }`}
            >
              {TYPE_LABELS[type].icon} {TYPE_LABELS[type].label}
            </button>
          ))}
        </div>

        <textarea
          value={newLog.content}
          onChange={(e) => setNewLog((p) => ({ ...p, content: e.target.value }))}
          placeholder="记录沟通内容..."
          className="w-full border rounded p-2 text-sm h-20 mb-2 resize-none"
        />

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newLog.nextAction}
            onChange={(e) => setNewLog((p) => ({ ...p, nextAction: e.target.value }))}
            placeholder="下一步行动（可选）"
            className="flex-1 min-w-[150px] border rounded px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={newLog.nextDate}
            onChange={(e) => setNewLog((p) => ({ ...p, nextDate: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newLog.content.trim()}
            className="px-4 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 mt-2">{error}</div>
        )}
      </div>

      {/* History */}
      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-500">暂无跟进记录</div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border-l-2 border-blue-200 pl-3 py-1"
            >
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {TYPE_LABELS[log.type]?.icon} {TYPE_LABELS[log.type]?.label}
                </span>
                <span>{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{log.content}</p>
              {log.nextAction && (
                <p className="text-xs text-blue-600 mt-1">
                  → {log.nextAction}
                  {log.nextDate && (
                    <span className="text-gray-500 ml-2">
                      ({new Date(log.nextDate).toLocaleDateString()})
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
