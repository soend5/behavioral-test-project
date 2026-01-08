"use client";

import { useState, useEffect } from "react";
import { AdminNav } from "../_components/AdminNav";

export default function AdminSOPPage() {
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/sop/definition", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setSops([]);
          setError(data?.error?.message || `加载失败（HTTP ${res.status}）`);
          return;
        }
        setSops(Array.isArray(data.data?.sops) ? data.data.sops : []);
      } catch {
        setSops([]);
        setError("加载失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

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
        <h1 className="text-2xl font-bold mb-1">SOP 配置管理</h1>
        <p className="text-sm text-gray-600 mb-4">
          管理 SOP Definition 与规则命中逻辑（用于助教端 realtime_panel）。
        </p>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 text-sm">
            {error}
          </div>
        ) : null}

        {sops.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="font-semibold mb-2">暂无 SOP 配置</div>
            <div className="text-sm text-gray-700 mb-4">
              当前系统未检测到任何 SOP Definition。通常原因是：生产/环境的 seed
              流程未包含 SOP 初始化或未执行。
            </div>
            <div className="text-sm text-gray-800">
              建议操作：触发仓库的 DB Deploy 工作流（含 `seed:prod`），或在安全门禁下运行 `npm run seed:prod`。
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">SOP ID</th>
                  <th className="py-2 pr-2">名称</th>
                  <th className="py-2 pr-2">阶段</th>
                  <th className="py-2 pr-2">优先级</th>
                  <th className="py-2 pr-2">状态</th>
                  <th className="py-2 pr-2">规则数</th>
                </tr>
              </thead>
              <tbody>
                {sops.map((sop) => (
                  <tr key={sop.sopId} className="border-b">
                    <td className="py-2 pr-2">{sop.sopId}</td>
                    <td className="py-2 pr-2">{sop.sopName}</td>
                    <td className="py-2 pr-2">{sop.sopStage}</td>
                    <td className="py-2 pr-2">{sop.priority}</td>
                    <td className="py-2 pr-2">{sop.status}</td>
                    <td className="py-2 pr-2">{sop.ruleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
