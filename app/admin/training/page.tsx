"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "../_components/AdminNav";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  status: string;
  createdAt: string;
  _count: { tasks: number; enrollments: number };
}

interface TrainingTask {
  id: string;
  planId: string;
  dayNo: number;
  orderNo: number;
  type: string;
  title: string;
  description: string;
  estimatedMinutes: number;
}

const TASK_TYPES = [
  { value: "read", label: "📖 阅读" },
  { value: "reflect", label: "💭 反思" },
  { value: "action", label: "✅ 行动" },
];

export default function AdminTrainingPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 计划表单
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    durationDays: 7,
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // 任务管理
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // 任务表单
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TrainingTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    dayNo: 1,
    orderNo: 1,
    type: "read",
    title: "",
    description: "",
    estimatedMinutes: 5,
  });
  const [savingTask, setSavingTask] = useState(false);

  // 加载计划列表
  async function fetchPlans() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/training/plans");
      const json = (await res.json()) as ApiResponse<{ plans: TrainingPlan[] }>;
      if (json.ok) {
        setPlans(json.data.plans);
      } else {
        setError(json.error.message);
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  // 加载任务列表
  async function fetchTasks(planId: string) {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/admin/training/tasks?planId=${planId}`);
      const json = (await res.json()) as ApiResponse<{ tasks: TrainingTask[] }>;
      if (json.ok) {
        setTasks(json.data.tasks);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTasks(false);
    }
  }

  useEffect(() => {
    void fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      void fetchTasks(selectedPlanId);
    } else {
      setTasks([]);
    }
  }, [selectedPlanId]);

  // 保存计划
  async function handleSavePlan() {
    setSavingPlan(true);
    setError(null);
    try {
      const url = editingPlan
        ? `/api/admin/training/plans/${editingPlan.id}`
        : "/api/admin/training/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanForm({ name: "", description: "", durationDays: 7 });
      await fetchPlans();
    } catch {
      setError("保存失败");
    } finally {
      setSavingPlan(false);
    }
  }

  // 删除计划
  async function handleDeletePlan(id: string) {
    if (!confirm("确定删除该训练计划？相关任务也会被删除。")) return;
    try {
      const res = await fetch(`/api/admin/training/plans/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      if (selectedPlanId === id) {
        setSelectedPlanId(null);
      }
      await fetchPlans();
    } catch {
      setError("删除失败");
    }
  }

  // 保存任务
  async function handleSaveTask() {
    if (!selectedPlanId) return;
    setSavingTask(true);
    setError(null);
    try {
      const url = editingTask
        ? `/api/admin/training/tasks/${editingTask.id}`
        : "/api/admin/training/tasks";
      const method = editingTask ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskForm, planId: selectedPlanId }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setShowTaskForm(false);
      setEditingTask(null);
      setTaskForm({
        dayNo: 1,
        orderNo: 1,
        type: "read",
        title: "",
        description: "",
        estimatedMinutes: 5,
      });
      await fetchTasks(selectedPlanId);
      await fetchPlans(); // 更新任务数
    } catch {
      setError("保存失败");
    } finally {
      setSavingTask(false);
    }
  }

  // 删除任务
  async function handleDeleteTask(id: string) {
    if (!confirm("确定删除该任务？")) return;
    if (!selectedPlanId) return;
    try {
      const res = await fetch(`/api/admin/training/tasks/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await fetchTasks(selectedPlanId);
      await fetchPlans();
    } catch {
      setError("删除失败");
    }
  }

  // 编辑计划
  function openEditPlan(plan: TrainingPlan) {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      durationDays: plan.durationDays,
    });
    setShowPlanForm(true);
  }

  // 编辑任务
  function openEditTask(task: TrainingTask) {
    setEditingTask(task);
    setTaskForm({
      dayNo: task.dayNo,
      orderNo: task.orderNo,
      type: task.type,
      title: task.title,
      description: task.description,
      estimatedMinutes: task.estimatedMinutes,
    });
    setShowTaskForm(true);
  }

  // 新建任务时自动设置 orderNo
  function openNewTask(dayNo?: number) {
    const dayTasks = tasks.filter((t) => t.dayNo === (dayNo || 1));
    const maxOrder = dayTasks.length > 0 ? Math.max(...dayTasks.map((t) => t.orderNo)) : 0;
    setEditingTask(null);
    setTaskForm({
      dayNo: dayNo || 1,
      orderNo: maxOrder + 1,
      type: "read",
      title: "",
      description: "",
      estimatedMinutes: 5,
    });
    setShowTaskForm(true);
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // 按天分组任务
  const tasksByDay: Record<number, TrainingTask[]> = {};
  for (const task of tasks) {
    if (!tasksByDay[task.dayNo]) {
      tasksByDay[task.dayNo] = [];
    }
    tasksByDay[task.dayNo].push(task);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">训练计划管理</h1>
            <p className="text-sm text-gray-600 mt-1">
              创建和管理客户行为训练计划。训练计划包含多天任务，帮助客户建立良好的行为习惯。
              您可以为每天配置阅读、反思、行动三种类型的任务。
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPlan(null);
              setPlanForm({ name: "", description: "", durationDays: 7 });
              setShowPlanForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 新建计划
          </button>
        </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            关闭
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：计划列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">训练计划</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : plans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无训练计划</div>
            ) : (
              <div className="divide-y">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedPlanId === plan.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{plan.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          plan.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {plan.status === "active" ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {plan.durationDays} 天 · {plan._count.tasks} 个任务 ·{" "}
                      {plan._count.enrollments} 人报名
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditPlan(plan);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：任务管理 */}
        <div className="lg:col-span-2">
          {selectedPlan ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedPlan.name} - 任务列表</h2>
                  <p className="text-sm text-gray-500">
                    共 {selectedPlan.durationDays} 天，{tasks.length} 个任务
                  </p>
                </div>
                <button
                  onClick={() => openNewTask()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  + 添加任务
                </button>
              </div>

              {loadingTasks ? (
                <div className="p-8 text-center text-gray-500">加载中...</div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暂无任务，点击上方按钮添加
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  {Array.from(
                    { length: selectedPlan.durationDays },
                    (_, i) => i + 1
                  ).map((day) => (
                    <div key={day}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-700">
                          第 {day} 天
                        </h3>
                        <button
                          onClick={() => openNewTask(day)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          + 添加
                        </button>
                      </div>
                      {tasksByDay[day]?.length > 0 ? (
                        <div className="space-y-2">
                          {tasksByDay[day]
                            .sort((a, b) => a.orderNo - b.orderNo)
                            .map((task) => (
                              <div
                                key={task.id}
                                className="p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {TASK_TYPES.find((t) => t.value === task.type)
                                        ?.label || task.type}
                                    </span>
                                    <span className="font-medium">
                                      {task.title}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      #{task.orderNo}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openEditTask(task)}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="text-xs text-red-600 hover:underline"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {task.description}
                                </p>
                                <div className="text-xs text-gray-400 mt-1">
                                  预计 {task.estimatedMinutes} 分钟
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 py-2">
                          暂无任务
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              请从左侧选择一个训练计划
            </div>
          )}
        </div>
      </div>

      {/* 计划表单弹窗 */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPlan ? "编辑计划" : "新建计划"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  计划名称
                </label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) =>
                    setPlanForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="如：7天行为训练"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) =>
                    setPlanForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 h-20"
                  placeholder="计划简介..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  训练天数
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={planForm.durationDays}
                  onChange={(e) =>
                    setPlanForm((p) => ({
                      ...p,
                      durationDays: parseInt(e.target.value) || 7,
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPlanForm(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSavePlan}
                disabled={savingPlan || !planForm.name.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPlan ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 任务表单弹窗 */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingTask ? "编辑任务" : "新建任务"}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    第几天
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedPlan?.durationDays || 7}
                    value={taskForm.dayNo}
                    onChange={(e) =>
                      setTaskForm((p) => ({
                        ...p,
                        dayNo: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顺序
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={taskForm.orderNo}
                    onChange={(e) =>
                      setTaskForm((p) => ({
                        ...p,
                        orderNo: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务类型
                </label>
                <select
                  value={taskForm.type}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, type: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务标题
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="如：阅读行为模式说明"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务描述
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 h-32"
                  placeholder="详细说明任务内容..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预计时间（分钟）
                </label>
                <input
                  type="number"
                  min={1}
                  value={taskForm.estimatedMinutes}
                  onChange={(e) =>
                    setTaskForm((p) => ({
                      ...p,
                      estimatedMinutes: parseInt(e.target.value) || 5,
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTaskForm(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveTask}
                disabled={
                  savingTask ||
                  !taskForm.title.trim() ||
                  !taskForm.description.trim()
                }
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingTask ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
