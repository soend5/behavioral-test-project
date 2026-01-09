"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminNav } from "../_components/AdminNav";
import { csrfFetch } from "@/lib/csrf-client";

type CoachStatus = "active" | "inactive";
type Coach = {
  id: string;
  username: string;
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

  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newStatus, setNewStatus] = useState<CoachStatus>("active");

  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {}
  );

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
    } catch (e) {
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
    try {
      const res = await csrfFetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
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
      setNewStatus("active");
      await load();
    } catch (e) {
      setError("创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function patchCoach(id: string, payload: { status?: CoachStatus; password?: string }) {
    setError(null);
    try {
      const res = await csrfFetch(`/api/admin/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ user: unknown }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch (e) {
      setError("更新失败");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">助教账号管理</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">创建助教账号</h2>
          <form onSubmit={createCoach} className="flex flex-wrap gap-3">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="用户名"
              className="border rounded px-3 py-2 w-56"
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="初始密码（≥6位）"
              type="password"
              className="border rounded px-3 py-2 w-56"
            />
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CoachStatus)}
              className="border rounded px-3 py-2"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <button
              type="submit"
              disabled={creating || !newUsername.trim() || !newPassword}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建"}
            </button>
          </form>
          {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
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
                    <th className="py-2 pr-2">状态</th>
                    <th className="py-2 pr-2">档案数</th>
                    <th className="py-2 pr-2">创建时间</th>
                    <th className="py-2 pr-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCoaches.map((coach) => (
                    <tr key={coach.id} className="border-b">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{coach.username}</div>
                        <div className="text-xs text-gray-500">{coach.id}</div>
                      </td>
                      <td className="py-2 pr-2">{coach.status}</td>
                      <td className="py-2 pr-2">{coach.customerCount}</td>
                      <td className="py-2 pr-2">
                        {new Date(coach.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          {coach.status === "active" ? (
                            <button
                              onClick={() => void patchCoach(coach.id, { status: "inactive" })}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                              禁用
                            </button>
                          ) : (
                            <button
                              onClick={() => void patchCoach(coach.id, { status: "active" })}
                              className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              启用
                            </button>
                          )}

                          <input
                            type="password"
                            placeholder="新密码"
                            value={passwordDrafts[coach.id] || ""}
                            onChange={(e) =>
                              setPasswordDrafts((prev) => ({
                                ...prev,
                                [coach.id]: e.target.value,
                              }))
                            }
                            className="border rounded px-2 py-1 w-40"
                          />
                          <button
                            onClick={() => {
                              const pw = (passwordDrafts[coach.id] || "").trim();
                              if (!pw) return;
                              void patchCoach(coach.id, { password: pw });
                              setPasswordDrafts((prev) => ({ ...prev, [coach.id]: "" }));
                            }}
                            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            重置密码
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!sortedCoaches.length ? (
                <p className="text-sm text-gray-500 mt-3">暂无助教账号</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

