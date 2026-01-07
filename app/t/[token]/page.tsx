"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InviteStatus = "active" | "entered" | "completed" | "expired";
type InviteResolve = {
  invite: {
    id: string;
    status: InviteStatus;
    customer: { id: string; nickname: string | null; name: string | null };
    coach: { id: string; username: string };
    version: string;
    quizVersion: string;
    expiresAt: string | null;
  };
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function InviteLandingPage({ params }: { params: { token: string } }) {
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InviteResolve["invite"] | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/public/invite/resolve?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as ApiResponse<InviteResolve>;
        if (!json.ok) {
          setError(json.error.message);
          setData(null);
          return;
        }
        setData(json.data.invite);
      } catch {
        setError("加载失败，请稍后重试");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [token]);

  const customerName = data?.customer.nickname || data?.customer.name || "客户";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">欢迎参加测评</h1>
        <p className="text-gray-600 mb-6">请确认邀请信息后开始测评。</p>
        <div className="mb-6 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          本测评用于生成交易行为结构画像与沟通建议，不构成投资顾问服务或任何买卖建议，不承诺收益。
        </div>

        {loading ? <div>加载中...</div> : null}
        {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

        {data ? (
          <div className="space-y-2 text-sm text-gray-700 mb-6">
            <div>
              <span className="text-gray-500">客户：</span>
              <span>{customerName}</span>
            </div>
            <div>
              <span className="text-gray-500">助教：</span>
              <span>{data.coach.username}</span>
            </div>
            <div>
              <span className="text-gray-500">测评版本：</span>
              <span>
                {data.quizVersion} / {data.version}
              </span>
            </div>
            <div>
              <span className="text-gray-500">状态：</span>
              <span>{data.status}</span>
            </div>
          </div>
        ) : null}

        {data?.status === "completed" ? (
          <Link
            href={`/t/${token}/result`}
            className="block text-center bg-blue-600 text-white rounded px-4 py-2"
          >
            查看结果
          </Link>
        ) : data?.status === "active" || data?.status === "entered" ? (
          <Link
            href={`/t/${token}/quiz`}
            className="block text-center bg-blue-600 text-white rounded px-4 py-2"
          >
            {data?.status === "entered" ? "继续测评" : "开始测评"}
          </Link>
        ) : data?.status === "expired" ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
            邀请已失效，请联系助教重新获取邀请链接。
          </div>
        ) : null}

        <p className="text-xs text-gray-400 mt-6 break-all">Token: {token}</p>
      </div>
    </div>
  );
}

