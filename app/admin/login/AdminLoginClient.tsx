"use client";

import { useState, type FormEvent } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/coaches";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      username: username.trim(),
      password,
      callbackUrl,
    });

    if (!result || result.error) {
      setError("用户名或密码错误，或账号已停用");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/coach/me", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{
        user: { id: string; username: string; role: string };
      }>;

      if (!json.ok || json.data.user.role !== "admin") {
        await signOut({ redirect: false });
        setError("该账号不是管理员");
        setSubmitting(false);
        return;
      }
    } catch {
      await signOut({ redirect: false });
      setError("登录校验失败，请重试");
      setSubmitting(false);
      return;
    }

    router.push(result.url || callbackUrl);
  }

  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">管理后台登录</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded px-3 py-2"
              autoComplete="username"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full border rounded px-3 py-2"
              autoComplete="current-password"
              placeholder="请输入密码"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
