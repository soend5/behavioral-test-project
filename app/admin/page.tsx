"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "./_components/AdminNav";

type ContentStatus = {
  version: string;
  quizzes: {
    fast: { questionCount: number; optionCount: number; imported: boolean };
    pro: { questionCount: number; optionCount: number; imported: boolean };
  };
  archetypes: { count: number; imported: boolean };
  trainingHandbook: { dayCount: number; sectionCount: number; imported: boolean };
  methodology: { sectionCount: number; imported: boolean };
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ContentStatus | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/content/status?version=v1", {
          cache: "no-store",
        });
        const json = (await res.json()) as ApiResponse<ContentStatus>;
        if (!json.ok) {
          setError(json.error.message);
          setStatus(null);
          return;
        }
        setStatus(json.data);
      } catch {
        setError("加载失败");
        setStatus(null);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  const cards: Array<{
    title: string;
    href: string;
    desc: string;
    statusText?: string;
  }> = [
    {
      title: "Quizzes",
      href: "/admin/quiz",
      desc: "题库查看（v1 默认只读）",
      statusText: status
        ? `fast: ${status.quizzes.fast.questionCount}/9, pro: ${status.quizzes.pro.questionCount}/18`
        : undefined,
    },
    {
      title: "Archetypes",
      href: "/admin/archetypes",
      desc: "6 画像文案（可编辑）",
      statusText: status ? `${status.archetypes.count}/6` : undefined,
    },
    {
      title: "Training Handbook",
      href: "/admin/training-handbook",
      desc: "7 天内训（可编辑）",
      statusText: status ? `${status.trainingHandbook.dayCount}/7` : undefined,
    },
    {
      title: "Methodology",
      href: "/admin/methodology",
      desc: "SOP 精修方法论（可编辑）",
      statusText: status ? `${status.methodology.sectionCount} sections` : undefined,
    },
    { title: "SOP Config", href: "/admin/sop", desc: "SOP 配置 CRUD" },
    { title: "Coaches", href: "/admin/coaches", desc: "助教账号管理" },
    { title: "Audit", href: "/admin/audit", desc: "审计日志" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="text-sm text-gray-500">
            Seed status:{" "}
            {loading
              ? "loading..."
              : status &&
                  status.quizzes.fast.imported &&
                  status.quizzes.pro.imported &&
                  status.archetypes.imported &&
                  status.trainingHandbook.imported &&
                  status.methodology.imported
                ? "imported"
                : "not imported"}
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <div className="text-lg font-semibold">{c.title}</div>
              <div className="text-sm text-gray-600 mt-1">{c.desc}</div>
              {c.statusText ? (
                <div className="mt-3 text-xs text-gray-500">{c.statusText}</div>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

