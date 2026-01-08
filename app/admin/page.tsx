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
      title: "系统设置",
      href: "/admin/settings",
      desc: "全局默认值与运营参数",
    },
    {
      title: "题库",
      href: "/admin/quiz",
      desc: "题库管理（编辑/停用/删除）",
      statusText: status
        ? `fast：${status.quizzes.fast.questionCount}/9，pro：${status.quizzes.pro.questionCount}/18`
        : undefined,
    },
    {
      title: "画像文案",
      href: "/admin/archetypes",
      desc: "6 画像文案（可编辑）",
      statusText: status ? `${status.archetypes.count}/6` : undefined,
    },
    {
      title: "内训手册",
      href: "/admin/training-handbook",
      desc: "7 天内训（可编辑）",
      statusText: status ? `${status.trainingHandbook.dayCount}/7` : undefined,
    },
    {
      title: "方法论",
      href: "/admin/methodology",
      desc: "SOP 精修方法论（可编辑）",
      statusText: status ? `${status.methodology.sectionCount} 章节` : undefined,
    },
    { title: "SOP 配置", href: "/admin/sop", desc: "SOP 配置管理" },
    { title: "助教账号", href: "/admin/coaches", desc: "助教账号管理" },
    { title: "审计日志", href: "/admin/audit", desc: "操作审计与追踪" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">总览</h1>
            <div className="text-sm text-gray-600 mt-1">
              用于确认 v1 内容资产导入状态与关键入口。
            </div>
          </div>
          <div className="text-sm text-gray-500">
            内容导入：{" "}
            {loading
              ? "加载中..."
              : status &&
                  status.quizzes.fast.imported &&
                  status.quizzes.pro.imported &&
                  status.archetypes.imported &&
                  status.trainingHandbook.imported &&
                  status.methodology.imported
                ? "已导入"
                : "未完成"}
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
