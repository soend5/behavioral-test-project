"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SettingsData | null>(null);

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
          <div className="space-y-6">
            {/* 题库版本配置 - 只读展示 + 跳转链接 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold mb-1">助教创建邀请：默认题库版本</div>
                  <div className="text-sm text-gray-600 mb-3">
                    该配置已移至「题库管理」页面，方便与题库一起管理。
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">当前默认版本：</span>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                      {data?.inviteDefaultQuizVersion || "v1"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/admin/quiz"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  前往题库管理
                </Link>
              </div>
            </div>

            {/* 其他设置占位 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="font-semibold mb-3">其他设置</div>
              <div className="text-sm text-gray-500">
                更多系统配置项将在后续版本中添加。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
