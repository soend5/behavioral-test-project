"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPLIANCE_NOTICE_CN, INVITE_STATUS_COPY } from "@/lib/ui-copy";

type InviteStatus = "active" | "entered" | "completed" | "expired";
type InviteResolve = {
  invite: {
    id: string;
    status: InviteStatus;
    customer: { id: string; nickname: string | null; name: string | null };
    coach: { id: string; username: string; name: string | null };
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

  const participantName = data?.customer.nickname || data?.customer.name || "测评参与者";
  const coachName = data?.coach.name || data?.coach.username || "助教";
  const statusCopy = data?.status ? INVITE_STATUS_COPY[data.status] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">欢迎参加测评</h1>
        <p className="text-gray-600 mb-6">请确认邀请信息后开始测评。</p>
        <div className="mb-6 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          {COMPLIANCE_NOTICE_CN}
        </div>

        {loading ? <div>加载中...</div> : null}
        {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

        {data ? (
          <>
            {/* 邀请信息 */}
            <div className="space-y-2 text-sm text-gray-700 mb-6">
              <div>
                <span className="text-gray-500">参与者：</span>
                <span>{participantName}</span>
              </div>
              <div>
                <span className="text-gray-500">助教：</span>
                <span>{coachName}</span>
              </div>
              <div>
                <span className="text-gray-500">测评版本：</span>
                <span>
                  {data.quizVersion} / {data.version}
                </span>
              </div>
            </div>

            {/* 状态卡片 */}
            {data.status === "completed" ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{statusCopy?.icon}</span>
                    <span className="font-semibold text-green-900">{statusCopy?.title}</span>
                  </div>
                  <p className="text-sm text-green-800 mb-2">{statusCopy?.description}</p>
                  <p className="text-xs text-green-700">{statusCopy?.nextStep}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/t/${token}/result`}
                    className="block text-center bg-blue-600 text-white rounded px-4 py-3 font-medium hover:bg-blue-700"
                  >
                    查看结果概览
                  </Link>
                  <div className="text-center text-sm text-gray-500">
                    或联系助教 {coachName} 获取陪跑建议
                  </div>
                </div>
              </div>
            ) : data.status === "expired" ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{statusCopy?.icon}</span>
                    <span className="font-semibold text-amber-900">{statusCopy?.title}</span>
                  </div>
                  <p className="text-sm text-amber-800 mb-2">{statusCopy?.description}</p>
                  <p className="text-xs text-amber-700">{statusCopy?.nextStep}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded border">
                  <div className="text-sm text-gray-600 mb-1">你的助教</div>
                  <div className="font-medium text-gray-900">{coachName}</div>
                </div>
              </div>
            ) : data.status === "active" || data.status === "entered" ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{statusCopy?.icon}</span>
                    <span className="font-semibold text-blue-900">{statusCopy?.title}</span>
                  </div>
                  <p className="text-sm text-blue-800">{statusCopy?.description}</p>
                </div>
                <Link
                  href={`/t/${token}/quiz`}
                  className="block text-center bg-blue-600 text-white rounded px-4 py-3 font-medium hover:bg-blue-700"
                >
                  {data.status === "entered" ? "继续测评" : "开始测评"}
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
