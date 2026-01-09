"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COMPLIANCE_NOTICE_CN } from "@/lib/ui-copy";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

interface Task {
  id: string;
  orderNo: number;
  type: string;
  title: string;
  description: string;
  content: unknown;
  estimatedMinutes: number;
  completed: boolean;
}

interface TrainingData {
  hasEnrollment: boolean;
  availablePlans?: Array<{
    id: string;
    name: string;
    description: string | null;
    durationDays: number;
    taskCount: number;
  }>;
  enrollment?: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
  };
  plan?: {
    id: string;
    name: string;
    description: string | null;
    durationDays: number;
  };
  currentDay?: number;
  progress?: number;
  completedTasks?: number;
  totalTasks?: number;
  tasksByDay?: Record<number, Task[]>;
}

const TASK_TYPE_ICONS: Record<string, string> = {
  read: "📖",
  reflect: "💭",
  action: "✅",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  read: "阅读",
  reflect: "反思",
  action: "行动",
};

export default function TrainingPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrainingData | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/training?token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as ApiResponse<TrainingData>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setData(json.data);
    } catch {
      setError("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, [token]);

  async function handleEnroll(planId: string) {
    setEnrolling(true);
    try {
      const res = await fetch("/api/public/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, planId }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await fetchData();
    } catch {
      setError("报名失败，请稍后重试");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleComplete(taskId: string, response?: unknown) {
    setCompleting(taskId);
    try {
      const res = await fetch("/api/public/training/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, taskId, response }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await fetchData();
      setExpandedTask(null);
    } catch {
      setError("提交失败，请稍后重试");
    } finally {
      setCompleting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">
            {error}
          </div>
          <Link
            href={`/t/${token}/result`}
            className="block text-center px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            返回测评结果
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // 未报名状态 - 显示可用计划
  if (!data.hasEnrollment) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              行为训练计划
            </h1>
            <p className="text-gray-600 mb-6">
              通过系统化的训练，帮助你建立更好的行为习惯
            </p>

            {data.availablePlans && data.availablePlans.length > 0 ? (
              <div className="space-y-4">
                {data.availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-xl p-5 hover:border-blue-300 transition-colors"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span>📅 {plan.durationDays} 天</span>
                      <span>📝 {plan.taskCount} 个任务</span>
                    </div>
                    <button
                      onClick={() => handleEnroll(plan.id)}
                      disabled={enrolling}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {enrolling ? "报名中..." : "开始训练"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无可用的训练计划
              </div>
            )}
          </div>

          <Link
            href={`/t/${token}/result`}
            className="block text-center text-blue-600 hover:text-blue-700"
          >
            ← 返回测评结果
          </Link>
        </div>
      </div>
    );
  }

  // 已报名状态 - 显示训练进度
  const { plan, currentDay, progress, tasksByDay, enrollment } = data;
  const todayTasks = tasksByDay?.[currentDay || 1] || [];
  const allTodayCompleted = todayTasks.every((t) => t.completed);
  const isCompleted = enrollment?.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        {/* 进度概览 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              {plan?.name || "行为训练"}
            </h1>
            {isCompleted && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                已完成 ✓
              </span>
            )}
          </div>

          {/* 天数进度条 */}
          <div className="flex gap-1 mb-3">
            {Array.from({ length: plan?.durationDays || 7 }, (_, i) => i + 1).map(
              (day) => (
                <div
                  key={day}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    day < (currentDay || 1)
                      ? "bg-green-500"
                      : day === currentDay
                      ? "bg-blue-500"
                      : "bg-gray-200"
                  }`}
                />
              )
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              第 {currentDay} 天 / 共 {plan?.durationDays} 天
            </span>
            <span className="text-gray-600">
              完成 {data.completedTasks}/{data.totalTasks} 个任务
            </span>
          </div>

          {/* 总进度 */}
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* 训练完成提示 */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="font-semibold text-green-800 mb-1">
              恭喜完成训练！
            </h3>
            <p className="text-sm text-green-700 mb-4">
              建议进行复测，查看你的行为变化
            </p>
            <Link
              href={`/t/${token}/result`}
              className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              查看测评结果
            </Link>
          </div>
        )}

        {/* 今日任务 */}
        {!isCompleted && (
          <>
            <h2 className="font-semibold text-gray-900 mb-3">
              今日任务 ({todayTasks.filter((t) => t.completed).length}/
              {todayTasks.length})
            </h2>

            <div className="space-y-3 mb-6">
              {todayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  expanded={expandedTask === task.id}
                  completing={completing === task.id}
                  onExpand={() =>
                    setExpandedTask(expandedTask === task.id ? null : task.id)
                  }
                  onComplete={(response) => handleComplete(task.id, response)}
                />
              ))}
            </div>

            {/* 今日完成提示 */}
            {allTodayCompleted && todayTasks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mb-6">
                <p className="text-blue-800 font-medium">🎯 今日任务已完成！</p>
                <p className="text-sm text-blue-600 mt-1">
                  明天继续，保持节奏
                </p>
              </div>
            )}
          </>
        )}

        {/* 历史天数（折叠） */}
        {tasksByDay && Object.keys(tasksByDay).length > 1 && (
          <details className="mb-6">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm">
              查看历史任务
            </summary>
            <div className="mt-3 space-y-4">
              {Object.entries(tasksByDay)
                .filter(([day]) => Number(day) < (currentDay || 1))
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([day, tasks]) => (
                  <div key={day}>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      第 {day} 天
                    </h4>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded-lg border ${
                            task.completed
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{TASK_TYPE_ICONS[task.type] || "📋"}</span>
                            <span
                              className={`text-sm ${
                                task.completed
                                  ? "text-green-700"
                                  : "text-gray-600"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.completed && (
                              <span className="ml-auto text-green-600">✓</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </details>
        )}

        {/* 底部导航 */}
        <div className="flex gap-3">
          <Link
            href={`/t/${token}/result`}
            className="flex-1 text-center py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            查看测评结果
          </Link>
        </div>

        {/* 合规提示 */}
        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            {COMPLIANCE_NOTICE_CN}
          </p>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  expanded,
  completing,
  onExpand,
  onComplete,
}: {
  task: Task;
  expanded: boolean;
  completing: boolean;
  onExpand: () => void;
  onComplete: (response?: unknown) => void;
}) {
  const [response, setResponse] = useState("");

  if (task.completed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TASK_TYPE_ICONS[task.type] || "📋"}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-800">{task.title}</span>
              <span className="text-green-600">✓</span>
            </div>
            <span className="text-xs text-green-600">
              {TASK_TYPE_LABELS[task.type] || task.type} · 已完成
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TASK_TYPE_ICONS[task.type] || "📋"}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{task.title}</div>
            <div className="text-xs text-gray-500">
              {TASK_TYPE_LABELS[task.type] || task.type} · 约{" "}
              {task.estimatedMinutes} 分钟
            </div>
          </div>
          <span
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
            {task.description}
          </p>

          {/* 反思类任务需要输入 */}
          {task.type === "reflect" && (
            <div className="mb-4">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="写下你的思考..."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={() =>
              onComplete(task.type === "reflect" ? { text: response } : undefined)
            }
            disabled={completing || (task.type === "reflect" && !response.trim())}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {completing ? "提交中..." : "完成任务"}
          </button>
        </div>
      )}
    </div>
  );
}
