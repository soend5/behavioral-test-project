"use client";

import { useState, useEffect } from "react";

export default function AdminQuizPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/quiz")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setQuizzes(data.data.quizzes);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">题库管理</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">版本</th>
              <th className="text-left">问卷版本</th>
              <th className="text-left">标题</th>
              <th className="text-left">状态</th>
              <th className="text-left">题目数</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <tr key={q.id}>
                <td>{q.version}</td>
                <td>{q.quizVersion}</td>
                <td>{q.title}</td>
                <td>{q.status}</td>
                <td>{q.questionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

