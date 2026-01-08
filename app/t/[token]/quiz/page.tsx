"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QuizQuestion = {
  id: string;
  orderNo: number;
  stem: string;
  options: Array<{ id: string; orderNo: number; text: string }>;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function QuizPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const totalCount = questions.length;
  const allAnswered = totalCount > 0 && answeredCount >= totalCount;

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        // 1) start attempt（幂等）
        const startRes = await fetch("/api/attempt/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const startJson = (await startRes.json()) as ApiResponse<{
          attemptId: string;
          quizVersion: string;
          version: string;
        }>;
        if (!startJson.ok) {
          setError(startJson.error.message);
          return;
        }
        setAttemptId(startJson.data.attemptId);

        // 2) fetch quiz
        const quizRes = await fetch(`/api/quiz?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const quizJson = (await quizRes.json()) as ApiResponse<{
          questions: QuizQuestion[];
          version: string;
          quizVersion: string;
        }>;
        if (!quizJson.ok) {
          setError(quizJson.error.message);
          return;
        }
        setQuestions(quizJson.data.questions);
      } catch {
        setError("加载失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [token]);

  async function submit() {
    if (!attemptId) return;
    if (!allAnswered) {
      setError("请完成所有题目后再提交");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 先写入答案（合并写入，服务端做题目/选项校验）
      const answersPayload = questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id],
      }));

      const answerRes = await fetch("/api/attempt/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          attemptId,
          answers: answersPayload,
        }),
      });
      const answerJson = (await answerRes.json()) as ApiResponse<{
        saved: boolean;
      }>;
      if (!answerJson.ok) {
        setError(answerJson.error.message);
        setSubmitting(false);
        return;
      }

      // 再提交
      const submitRes = await fetch("/api/attempt/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, attemptId }),
      });
      const submitJson = (await submitRes.json()) as ApiResponse<{
        attemptId: string;
        submittedAt: string | null;
        result: unknown;
      }>;
      if (!submitJson.ok) {
        setError(submitJson.error.message);
        setSubmitting(false);
        return;
      }

      router.push(`/t/${token}/result`);
    } catch {
      setError("提交失败，请稍后重试");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">测评题目</h1>
        <p className="text-sm text-gray-600 mb-6">
          已完成 {answeredCount}/{totalCount}
        </p>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-6">
            <div>{error}</div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/t/${token}`)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                返回邀请页
              </button>
              <button
                onClick={() => router.push(`/t/${token}/result`)}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                查看结果概览
              </button>
            </div>
          </div>
        ) : null}

        {questions.length ? (
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="border rounded p-4">
                <div className="font-semibold mb-3">
                  {q.orderNo}. {q.stem}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.id}
                        checked={answers[q.id] === opt.id}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                        }
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded p-4 text-sm text-gray-700">
            暂无题目可展示。请返回邀请页确认测评状态，或联系助教重新获取邀请链接。
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/t/${token}`)}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            返回
          </button>
          <button
            onClick={() => void submit()}
            disabled={submitting || !allAnswered}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {submitting ? "提交中..." : "提交测评"}
          </button>
        </div>
      </div>
    </div>
  );
}

