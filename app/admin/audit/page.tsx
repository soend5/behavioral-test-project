"use client";

import { useState, useEffect } from "react";

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

  if (loading) return <div>加载中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">审计日志</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">时间</th>
              <th className="text-left">操作人</th>
              <th className="text-left">操作</th>
              <th className="text-left">目标类型</th>
              <th className="text-left">目标ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actorUser?.username}</td>
                <td>{log.action}</td>
                <td>{log.targetType}</td>
                <td>{log.targetId}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="mr-2 px-4 py-2 bg-gray-200 rounded"
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
  );
}
