"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type ResultData = {
  attempt: {
    id: string;
    version: string;
    submittedAt: string | null;
    tags: string[];
    stage: string | null;
    resultSummary: any;
  };
};

export default function ResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData["attempt"] | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/public/attempt/result?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as ApiResponse<ResultData>;
        if (!json.ok) {
          setError(json.error.message);
          setData(null);
          return;
        }
        setData(json.data.attempt);
      } catch {
        setError("加载失败，请稍后重试");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">测评结果</h1>
        <p className="text-gray-600 mb-6">感谢您的参与。</p>
        <div className="mb-6 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          结果为交易行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。
        </div>

        {loading ? <div>加载中...</div> : null}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-6">
            {error}
            <div className="mt-3 flex gap-3">
              <Link
                href={`/t/${token}`}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                返回邀请页
              </Link>
              <Link
                href={`/t/${token}/quiz`}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                继续测评
              </Link>
            </div>
          </div>
        ) : null}

        {data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <div className="text-sm text-gray-500">版本</div>
                <div className="font-semibold">{data.version}</div>
              </div>
              <div className="border rounded p-4">
                <div className="text-sm text-gray-500">提交时间</div>
                <div className="font-semibold">
                  {data.submittedAt ? new Date(data.submittedAt).toLocaleString() : "-"}
                </div>
              </div>
            </div>

            <div className="border rounded p-4">
              <div className="text-sm text-gray-500 mb-2">标签</div>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-gray-100 border rounded px-2 py-1"
                  >
                    {t}
                  </span>
                ))}
                {!data.tags.length ? (
                  <span className="text-sm text-gray-400">无</span>
                ) : null}
              </div>
            </div>

            <div className="border rounded p-4">
              <div className="text-sm text-gray-500 mb-2">结果摘要</div>
              <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto">
                {JSON.stringify(data.resultSummary, null, 2)}
              </pre>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/t/${token}`}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                返回邀请页
              </Link>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-gray-400 mt-6 break-all">Token: {token}</p>
      </div>
    </div>
  );
}

