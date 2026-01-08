"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CoachNav } from "../_components/CoachNav";

type Invite = {
  id: string;
  tokenHash: string;
  status: string;
  customer: { id: string; nickname: string | null; name: string | null };
  version: string;
  quizVersion: string;
  createdAt: string;
  expiresAt: string | null;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function InvitesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const statusLabel: Record<string, string> = {
    active: "可开始",
    entered: "进行中",
    completed: "已完成",
    expired: "已失效",
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/invites?page=1&limit=50", {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<{
        invites: Invite[];
      }>;
      if (!json.ok) {
        setError(json.error.message);
        setInvites([]);
        return;
      }
      setInvites(json.data.invites);
    } catch {
      setError("加载失败");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function expire(inviteId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/coach/invites/${inviteId}/expire`, {
        method: "POST",
      });
      const json = (await res.json()) as ApiResponse<{ invite: unknown }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      await load();
    } catch {
      setError("操作失败");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">邀请管理</h1>
            <div className="text-sm text-gray-600 mt-1">
              管理邀请链接与状态；同一参与者同版本仅允许 1 个 active 邀请。
            </div>
          </div>
          <Link
            href="/coach/invites/new"
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            新建邀请
          </Link>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <div>加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">参与者</th>
                    <th className="py-2 pr-2">状态</th>
                    <th className="py-2 pr-2">版本</th>
                    <th className="py-2 pr-2">创建时间</th>
                    <th className="py-2 pr-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="py-2 pr-2">
                        <div className="font-medium">
                          {inv.customer.nickname || inv.customer.name || "未命名"}
                        </div>
                        <div className="text-xs text-gray-500">{inv.id}</div>
                      </td>
                      <td className="py-2 pr-2">{statusLabel[inv.status] ?? inv.status}</td>
                      <td className="py-2 pr-2">
                        {inv.quizVersion} / {inv.version}
                      </td>
                      <td className="py-2 pr-2">
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/coach/clients/${inv.customer.id}`}
                            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                          >
                            查看档案
                          </Link>
                          {(inv.status === "active" || inv.status === "entered") ? (
                            <button
                              onClick={() => void expire(inv.id)}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                              设为失效
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!invites.length ? (
                <p className="text-sm text-gray-500 mt-3">暂无邀请</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

