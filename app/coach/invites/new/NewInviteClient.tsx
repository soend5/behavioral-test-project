"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CoachNav } from "../../_components/CoachNav";

type Customer = {
  id: string;
  name: string | null;
  nickname: string | null;
  phone: string | null;
  latestAttempt: any;
};

type CreatedInvite = {
  id: string;
  token: string;
  tokenHash: string;
  status: string;
  customerId: string;
  version: string;
  quizVersion: string;
  expiresAt: string | null;
  url: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function NewInviteClient() {
  const searchParams = useSearchParams();
  const customerIdFromQuery = searchParams.get("customerId") || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState(customerIdFromQuery);
  const [version, setVersion] = useState<"fast" | "pro">("fast");
  const [quizVersion, setQuizVersion] = useState("v1");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedInvite | null>(null);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId) || null;
  }, [customers, customerId]);

  useEffect(() => {
    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const res = await fetch("/api/coach/customers?page=1&limit=100", {
          cache: "no-store",
        });
        const json = (await res.json()) as ApiResponse<{ customers: Customer[] }>;
        if (!json.ok) {
          setError(json.error.message);
          setCustomers([]);
          return;
        }
        setCustomers(json.data.customers);
        setError(null);

        if (!customerIdFromQuery && json.data.customers.length > 0) {
          setCustomerId(json.data.customers[0].id);
        }
      } catch {
        setError("加载客户失败");
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    }
    void loadCustomers();
  }, [customerIdFromQuery]);

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    if (!customerId) return;

    setCreating(true);
    setError(null);
    setCreated(null);

    try {
      const res = await fetch("/api/coach/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          version,
          quizVersion: quizVersion.trim(),
          ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        }),
      });

      const json = (await res.json()) as ApiResponse<{ invite: CreatedInvite }>;
      if (!json.ok) {
        setError(json.error.message);
        setCreating(false);
        return;
      }

      setCreated(json.data.invite);
    } catch {
      setError("创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNav />
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">创建邀请链接</h1>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={createInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客户
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={loadingCustomers}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.nickname || c.name || "未命名") +
                      (c.phone ? `（${c.phone}）` : "")}
                  </option>
                ))}
              </select>
              {!customers.length && !loadingCustomers ? (
                <p className="text-sm text-gray-500 mt-2">
                  暂无客户，请先到{" "}
                  <Link href="/coach/dashboard" className="underline">
                    客户列表
                  </Link>{" "}
                  创建客户。
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  测评版本
                </label>
                <select
                  value={version}
                  onChange={(e) => setVersion(e.target.value as "fast" | "pro")}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="fast">fast</option>
                  <option value="pro">pro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  quizVersion
                </label>
                <input
                  value={quizVersion}
                  onChange={(e) => setQuizVersion(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="例如 v1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                过期时间（可选）
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                不设置则永不过期（由助教手动失效或提交后完成）。
              </p>
            </div>

            <button
              type="submit"
              disabled={creating || !customerId || !quizVersion.trim()}
              className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建邀请"}
            </button>

            {selectedCustomer ? (
              <div className="text-xs text-gray-500">
                目标客户：
                {selectedCustomer.nickname || selectedCustomer.name || selectedCustomer.id}
              </div>
            ) : null}
          </form>
        </div>

        {created ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3">
              邀请已创建（明文 token 仅展示一次）
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500">邀请链接</div>
                <div className="break-all font-mono text-xs bg-gray-50 border rounded p-2">
                  {created.url}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Token</div>
                <div className="break-all font-mono text-xs bg-gray-50 border rounded p-2">
                  {created.token}
                </div>
              </div>
              <div>
                <div className="text-gray-500">TokenHash</div>
                <div className="break-all font-mono text-xs bg-gray-50 border rounded p-2">
                  {created.tokenHash}
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href={created.url}
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                  target="_blank"
                >
                  打开邀请页
                </Link>
                <Link
                  href="/coach/invites"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  查看邀请列表
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

