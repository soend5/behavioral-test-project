"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPLIANCE_NOTICE_CN, INVITE_STATUS_COPY, LANDING_PAGE_COPY } from "@/lib/ui-copy";
import { track, setInviteToken, TRACKING_EVENTS } from "@/lib/tracking";

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
        // v1.7: 埋点 - 落地页访问
        setInviteToken(token);
        track(TRACKING_EVENTS.LANDING_PAGE_VIEW, {
          inviteStatus: json.data.invite.status,
          version: json.data.invite.version,
        });
      } catch {
        setError("加载失败，请稍后重试");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [token]);

  const coachName = data?.coach.name || data?.coach.username || "助教";
  const statusCopy = data?.status ? INVITE_STATUS_COPY[data.status] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* v1.5: 优化标题和副标题 */}
        <h1 className="text-2xl font-bold mb-2 leading-tight">
          {LANDING_PAGE_COPY.title}
        </h1>
        <p className="text-gray-600 mb-6">{LANDING_PAGE_COPY.subtitle}</p>

        {loading ? <div className="text-center py-4">加载中...</div> : null}
        {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

        {data ? (
          <>
            {/* 助教信息卡片（突出显示） */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {coachName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm text-gray-500">你的专属助教</div>
                  <div className="font-medium text-gray-900">{coachName}</div>
                </div>
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
                    className="block text-center bg-blue-600 text-white rounded-lg px-4 py-4 font-medium hover:bg-blue-700 transition-colors"
                  >
                    查看我的结果
                  </Link>
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
              </div>
            ) : data.status === "active" || data.status === "entered" ? (
              <div className="space-y-4">
                {/* 测评说明 */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>{data.version === "fast" ? "9道题，约3分钟" : "18道题，约6分钟"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>没有对错，只是记录你的操作习惯</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>完成后助教会帮你解读结果</span>
                  </div>
                </div>

                <Link
                  href={`/t/${token}/quiz`}
                  onClick={() => track(TRACKING_EVENTS.LANDING_START_CLICK, { status: data.status })}
                  className="block text-center bg-blue-600 text-white rounded-lg px-4 py-4 font-medium hover:bg-blue-700 transition-colors text-lg"
                >
                  {data.status === "entered" ? LANDING_PAGE_COPY.continueButton : LANDING_PAGE_COPY.startButton}
                </Link>
              </div>
            ) : null}

            {/* v1.5: 合规提示移至底部，简化措辞 */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">{COMPLIANCE_NOTICE_CN}</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
