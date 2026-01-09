"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminNav } from "../_components/AdminNav";
import { csrfFetch } from "@/lib/csrf-client";

type CoachStatus = "active" | "inactive";
type Coach = {
  id: string;
  username: string;
  name: string | null;
  wechatQrcode: string | null;
  role: string;
  status: CoachStatus;
  createdAt: string;
  updatedAt: string;
  customerCount: number;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 创建表单
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState<CoachStatus>("active");

  // 编辑弹窗
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    wechatQrcode: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const sortedCoaches = useMemo(() => {
    return [...coaches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [coaches]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coaches?limit=200", {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<{ coaches: Coach[] }>;
      if (!json.ok) {
        setError(json.error.message);
        setCoaches([]);
        return;
      }
      setCoaches(json.data.coaches);
    } catch {
      setError("加载失败");
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCoach(e: FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await csrfFetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          name: newName.trim() || null,
          status: newStatus,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ user: unknown }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewStatus("active");
      setSuccess("助教账号创建成功");
      await load();
    } catch {
      setError("创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function patchCoach(id: string, payload: { 
    status?: CoachStatus; 
    password?: string;
    name?: string | null;
    wechatQrcode?: string | null;
  }) {
    setError(null);
    setSuccess(null);
    try {
      const res = await csrfFetch(`/api/admin/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ user: unknown }>;
      if (!json.ok) {
        setError(json.error.message);
        return false;
      }
      await load();
      return true;
    } catch {
      setError("更新失败");
      return false;
    }
  }

  function openEditModal(coach: Coach) {
    setEditingCoach(coach);
    setEditForm({
      name: coach.name || "",
      wechatQrcode: coach.wechatQrcode || "",
      password: "",
    });
  }

  async function handleSaveEdit() {
    if (!editingCoach) return;
    setSaving(true);
    setError(null);
    
    const payload: Record<string, string | null> = {};
    if (editForm.name !== (editingCoach.name || "")) {
      payload.name = editForm.name.trim() || null;
    }
    if (editForm.wechatQrcode !== (editingCoach.wechatQrcode || "")) {
      payload.wechatQrcode = editForm.wechatQrcode.trim() || null;
    }
    if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    if (Object.keys(payload).length === 0) {
      setEditingCoach(null);
      setSaving(false);
      return;
    }

    const success = await patchCoach(editingCoach.id, payload);
    if (success) {
      setSuccess("助教信息更新成功");
      setEditingCoach(null);
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">助教账号管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            管理助教账号信息，包括用户名、显示名称、微信二维码等。
            助教的显示名称和二维码会展示在客户测评结果页面。
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3 text-sm mb-4">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">创建助教账号</h2>
          <form onSubmit={createCoach} className="flex flex-wrap gap-3">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="用户名（登录用）"
              className="border rounded px-3 py-2 w-48"
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="初始密码（≥6位）"
              type="password"
              className="border rounded px-3 py-2 w-48"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="显示名称（可选）"
              className="border rounded px-3 py-2 w-48"
            />
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CoachStatus)}
              className="border rounded px-3 py-2"
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
            <button
              type="submit"
              disabled={creating || !newUsername.trim() || !newPassword}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
            >
              {creating ? "创建中..." : "创建"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-3">助教列表</h2>
          {loading ? (
            <div>加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">用户名</th>
                    <th className="py-2 pr-2">显示名称</th>
                    <th className="py-2 pr-2">二维码</th>
                    <th className="py-2 pr-2">状态</th>
                    <th className="py-2 pr-2">档案数</th>
                    <th className="py-2 pr-2">创建时间</th>
                    <th className="py-2 pr-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCoaches.map((coach) => (
                    <tr key={coach.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-2">
                        <div className="font-medium">{coach.username}</div>
                        <div className="text-xs text-gray-400">{coach.id.slice(0, 8)}...</div>
                      </td>
                      <td className="py-3 pr-2">
                        {coach.name || <span className="text-gray-400">未设置</span>}
                      </td>
                      <td className="py-3 pr-2">
                        {coach.wechatQrcode ? (
                          <span className="text-green-600 text-xs">✓ 已上传</span>
                        ) : (
                          <span className="text-gray-400 text-xs">未上传</span>
                        )}
                      </td>
                      <td className="py-3 pr-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          coach.status === "active" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {coach.status === "active" ? "启用" : "停用"}
                        </span>
                      </td>
                      <td className="py-3 pr-2">{coach.customerCount}</td>
                      <td className="py-3 pr-2 text-gray-500">
                        {new Date(coach.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(coach)}
                            className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                          >
                            编辑
                          </button>
                          {coach.status === "active" ? (
                            <button
                              onClick={() => void patchCoach(coach.id, { status: "inactive" })}
                              className="px-3 py-1 rounded bg-gray-200 text-xs hover:bg-gray-300"
                            >
                              停用
                            </button>
                          ) : (
                            <button
                              onClick={() => void patchCoach(coach.id, { status: "active" })}
                              className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                            >
                              启用
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!sortedCoaches.length && (
                <p className="text-sm text-gray-500 mt-3 text-center py-4">暂无助教账号</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editingCoach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              编辑助教信息 - {editingCoach.username}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  显示名称
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="客户看到的助教名称"
                />
                <p className="text-xs text-gray-500 mt-1">
                  此名称会显示在客户测评结果页面
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  微信二维码 URL
                </label>
                <input
                  type="text"
                  value={editForm.wechatQrcode}
                  onChange={(e) => setEditForm(f => ({ ...f, wechatQrcode: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://example.com/qrcode.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  请先将二维码图片上传到图床，然后粘贴图片URL
                </p>
                {editForm.wechatQrcode && (
                  <div className="mt-2">
                    <img 
                      src={editForm.wechatQrcode} 
                      alt="二维码预览" 
                      className="w-24 h-24 object-contain border rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重置密码（可选）
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="留空则不修改密码"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingCoach(null)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
