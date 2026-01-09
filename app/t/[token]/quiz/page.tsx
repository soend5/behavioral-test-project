"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPLIANCE_NOTICE_CN, QUIZ_PAGE_COPY } from "@/lib/ui-copy";

type QuizQuestion = {
  id: string;
  orderNo: number;
  stem: string;
  options: Array<{ id: string; orderNo: number; text: string }>;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

// v1.5: 进度条组件
function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const estimatedMinutes = Math.max(1, Math.ceil((total - current) * 0.35)); // 每题约20秒

  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>{QUIZ_PAGE_COPY.progressText(current, total)}</span>
        <span>{current < total ? QUIZ_PAGE_COPY.estimatedTime(estimatedMinutes) : "即将完成"}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* 鼓励文案 */}
      {current > 0 && current < total && percent >= 50 && (
        <p className="text-xs text-blue-600 mt-2 text-center">
          {QUIZ_PAGE_COPY.encouragement[Math.min(2, Math.floor(percent / 30))]}
        </p>
      )}
    </div>
  );
}

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
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-2">{QUIZ_PAGE_COPY.title}</h1>
        
        {/* v1.5: 进度条 */}
        <ProgressBar current={answeredCount} total={totalCount} />

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">
            <div>{error}</div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/t/${token}`)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 transition-colors"
              >
                返回邀请页
              </button>
              <button
                onClick={() => router.push(`/t/${token}/result`)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                查看结果概览
              </button>
            </div>
          </div>
        ) : null}

        {questions.length ? (
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 md:p-5">
                <div className="font-medium mb-4 text-gray-900">
                  <span className="text-blue-600 mr-2">{q.orderNo}.</span>
                  {q.stem}
                </div>
                {/* v1.5: 优化选项样式，增大点击区域 */}
                <div className="space-y-3">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all duration-200 min-h-[56px] ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt.id}
                          checked={isSelected}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                          }
                          className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`flex-1 ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-4 text-sm text-gray-700">
            暂无题目可展示。请返回邀请页确认测评状态，或联系助教重新获取邀请链接。
          </div>
        )}

        {/* 底部操作区 */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push(`/t/${token}`)}
            className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            返回
          </button>
          <button
            onClick={() => void submit()}
            disabled={submitting || !allAnswered}
            className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {submitting ? QUIZ_PAGE_COPY.submittingButton : QUIZ_PAGE_COPY.submitButton}
          </button>
        </div>

        {/* v1.5: 合规提示简化 */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">{COMPLIANCE_NOTICE_CN}</p>
        </div>
      </div>
    </div>
  );
}

