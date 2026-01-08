"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "../_components/AdminNav";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type SettingsData = {
  inviteDefaultQuizVersion: string;
  availableQuizVersions: string[];
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<SettingsData | null>(null);
  const [inviteDefaultQuizVersion, setInviteDefaultQuizVersion] = useState("v1");

  const options = useMemo(() => data?.availableQuizVersions || [], [data]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<SettingsData>;
      if (!json.ok) {
        setError(json.error.message);
        setData(null);
        return;
      }
      setData(json.data);
      setInviteDefaultQuizVersion(json.data.inviteDefaultQuizVersion || "v1");
    } catch {
      setError("加载失败");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteDefaultQuizVersion }),
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
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">系统设置</h1>
            <div className="text-sm text-gray-600 mt-1">用于配置全局默认值与运营参数。</div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">加载中...</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="font-semibold">助教创建邀请：默认题库版本（quizVersion）</div>
            <div className="text-sm text-gray-600">
              该配置会作为助教端「新建邀请」的默认值。实际创建时仍会校验题库是否存在且为 active。
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div>
                <div className="text-xs text-gray-500 mb-1">默认 quizVersion</div>
                {options.length ? (
                  <select
                    value={inviteDefaultQuizVersion}
                    onChange={(e) => setInviteDefaultQuizVersion(e.target.value)}
                    className="border rounded px-3 py-2 w-full bg-white"
                    disabled={saving}
                  >
                    {options.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={inviteDefaultQuizVersion}
                    onChange={(e) => setInviteDefaultQuizVersion(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                    placeholder="例如 v1"
                    disabled={saving}
                  />
                )}
              </div>
              <button
                onClick={() => void save()}
                disabled={saving || !inviteDefaultQuizVersion.trim()}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存设置"}
              </button>
            </div>

            <div className="text-xs text-gray-500">
              当前可选项来自题库表的 quizVersion 去重结果；仅允许设置为同时存在 fast/pro 且为 active
              的 quizVersion。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

