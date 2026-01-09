"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type TodoItem = {
  type: "new_completion" | "in_progress" | "expiring_soon";
  priority: number;
  customerId: string;
  customerName: string;
  inviteId: string;
  timestamp: string;
  actionUrl: string;
  daysUntilExpiry?: number;
};

type TodoSummary = {
  newCompletions: number;
  inProgress: number;
  expiringSoon: number;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

const TODO_TYPE_CONFIG = {
  new_completion: {
    label: "新完成",
    icon: "✅",
    color: "bg-green-50 border-green-200 text-green-800",
    badgeColor: "bg-green-500",
  },
  in_progress: {
    label: "进行中",
    icon: "✏️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    badgeColor: "bg-blue-500",
  },
  expiring_soon: {
    label: "即将过期",
    icon: "⏰",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    badgeColor: "bg-amber-500",
  },
};

// 轮询间隔（毫秒）
const POLL_INTERVAL = 60000;

export function TodoPanel() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [expanded, setExpanded] = useState(true); // v1.9: 默认展开

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/todos", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{
        todos: TodoItem[];
        summary: TodoSummary;
      }>;
      if (json.ok) {
        setTodos(json.data.todos);
        setSummary(json.data.summary);
      }
    } catch {
      // 静默失败，不影响主页面
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const totalCount = summary
    ? summary.newCompletions + summary.inProgress + summary.expiringSoon
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="text-sm text-gray-500">加载待办事项...</div>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="text-gray-600">暂无待处理事项</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      {/* 头部：汇总信息 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <span className="font-medium">待处理事项</span>
          <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium">
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {summary && summary.newCompletions > 0 && (
            <div className="flex items-center gap-1 text-sm text-green-700">
              <span>✅</span>
              <span>{summary.newCompletions} 新完成</span>
            </div>
          )}
          {summary && summary.inProgress > 0 && (
            <div className="flex items-center gap-1 text-sm text-blue-700">
              <span>✏️</span>
              <span>{summary.inProgress} 进行中</span>
            </div>
          )}
          {summary && summary.expiringSoon > 0 && (
            <div className="flex items-center gap-1 text-sm text-amber-700">
              <span>⏰</span>
              <span>{summary.expiringSoon} 即将过期</span>
            </div>
          )}
          <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* 展开的待办列表 */}
      {expanded && (
        <div className="border-t p-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todos.slice(0, 10).map((todo, index) => {
              const config = TODO_TYPE_CONFIG[todo.type];
              const timeStr = todo.type === "expiring_soon" && todo.daysUntilExpiry !== undefined
                ? formatExpiryTime(todo.daysUntilExpiry)
                : formatRelativeTime(todo.timestamp);
              return (
                <Link
                  key={`${todo.inviteId}-${index}`}
                  href={todo.actionUrl}
                  className={`block p-3 rounded border ${config.color} hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span className="font-medium">{todo.customerName}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/50">
                        {config.label}
                      </span>
                    </div>
                    <span className="text-xs opacity-70">{timeStr}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {todos.length > 10 && (
            <div className="mt-3 text-center text-sm text-gray-500">
              还有 {todos.length - 10} 项待处理...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0) {
    // 未来时间（即将过期）
    const futureDays = Math.ceil(Math.abs(diffMs) / 86400000);
    const futureHours = Math.ceil(Math.abs(diffMs) / 3600000);
    if (futureHours < 24) return `${futureHours} 小时后过期`;
    return `${futureDays} 天后过期`;
  }

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString();
}

function formatExpiryTime(daysUntilExpiry: number): string {
  if (daysUntilExpiry <= 0) return "今天过期";
  if (daysUntilExpiry === 1) return "明天过期";
  return `${daysUntilExpiry} 天后过期`;
}
