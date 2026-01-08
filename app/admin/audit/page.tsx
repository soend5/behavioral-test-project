"use client";

import { useState, useEffect } from "react";
import { AdminNav } from "../_components/AdminNav";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/audit?page=${page}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setLogs(data.data.logs);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

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
        <h1 className="text-2xl font-bold mb-4">审计日志</h1>
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">时间</th>
                <th className="py-2 pr-2">操作人</th>
                <th className="py-2 pr-2">操作</th>
                <th className="py-2 pr-2">目标类型</th>
                <th className="py-2 pr-2">目标ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-2 pr-2">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-2">{log.actorUser?.username}</td>
                  <td className="py-2 pr-2">{log.action}</td>
                  <td className="py-2 pr-2">{log.targetType}</td>
                  <td className="py-2 pr-2">{log.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="mr-2 px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
