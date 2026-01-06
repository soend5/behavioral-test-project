"use client";

import { useState, useEffect } from "react";

export default function AdminSOPPage() {
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sop/definition")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setSops(data.data.sops);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SOP 配置管理</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">SOP ID</th>
              <th className="text-left">名称</th>
              <th className="text-left">阶段</th>
              <th className="text-left">优先级</th>
              <th className="text-left">状态</th>
              <th className="text-left">规则数</th>
            </tr>
          </thead>
          <tbody>
            {sops.map((sop) => (
              <tr key={sop.sopId}>
                <td>{sop.sopId}</td>
                <td>{sop.sopName}</td>
                <td>{sop.sopStage}</td>
                <td>{sop.priority}</td>
                <td>{sop.status}</td>
                <td>{sop.ruleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
