"use client";

import { useState, useEffect } from "react";

export default function AdminOptionsPage() {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionId, setQuestionId] = useState("");

  useEffect(() => {
    const url = questionId
      ? `/api/admin/options?question_id=${questionId}`
      : "/api/admin/options";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setOptions(data.data.options);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [questionId]);

  if (loading) return <div>加载中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">选项管理</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="筛选 question_id"
          value={questionId}
          onChange={(e) => setQuestionId(e.target.value)}
          className="border p-2"
        />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">顺序</th>
              <th className="text-left">选项文本</th>
              <th className="text-left">题目</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt) => (
              <tr key={opt.id}>
                <td>{opt.orderNo}</td>
                <td>{opt.text}</td>
                <td>{opt.question?.stem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

