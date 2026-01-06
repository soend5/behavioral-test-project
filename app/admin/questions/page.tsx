"use client";

import { useState, useEffect } from "react";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState("");

  useEffect(() => {
    const url = quizId
      ? `/api/admin/questions?quiz_id=${quizId}`
      : "/api/admin/questions";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setQuestions(data.data.questions);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [quizId]);

  if (loading) return <div>加载中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">题目管理</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="筛选 quiz_id"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          className="border p-2"
        />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">顺序</th>
              <th className="text-left">题目</th>
              <th className="text-left">状态</th>
              <th className="text-left">选项数</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td>{q.orderNo}</td>
                <td>{q.stem}</td>
                <td>{q.status}</td>
                <td>{q.optionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
