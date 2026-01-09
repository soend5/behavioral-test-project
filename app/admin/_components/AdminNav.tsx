"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

type NavGroup = {
  label: string;
  items: { href: string; label: string }[];
};

const navGroups: NavGroup[] = [
  {
    label: "运营",
    items: [
      { href: "/admin/dashboard", label: "📊 数据看板" },
    ],
  },
  {
    label: "策略",
    items: [
      { href: "/admin/strategy", label: "🎯 策略中心" },
      { href: "/admin/strategy/dependencies", label: "🔗 依赖关系" },
      { href: "/admin/tags", label: "🏷️ 标签管理" },
      { href: "/admin/sop", label: "📋 SOP配置" },
      { href: "/admin/scripts", label: "💬 话术库" },
      { href: "/admin/training", label: "📅 训练计划" },
    ],
  },
  {
    label: "内容",
    items: [
      { href: "/admin/quiz", label: "📝 题库" },
      { href: "/admin/archetypes", label: "👤 画像文案" },
      { href: "/admin/training-handbook", label: "📚 内训手册" },
      { href: "/admin/methodology", label: "📖 方法论" },
    ],
  },
  {
    label: "管理",
    items: [
      { href: "/admin/coaches", label: "👥 助教账号" },
      { href: "/admin/settings", label: "⚙️ 系统设置" },
      { href: "/admin/audit", label: "📋 审计日志" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <div className="font-semibold mr-2">管理后台</div>
          <div className="flex items-center gap-6 flex-1">
            {navGroups.map((group) => (
              <div key={group.label} className="flex items-center gap-1">
                <span className="text-xs text-gray-400 mr-1">{group.label}</span>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm px-3 py-1 rounded border ${
                      isActive(item.href)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200"
          >
            退出登录
          </button>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <div className="font-semibold">管理后台</div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200"
            >
              {mobileOpen ? "收起" : "菜单"}
            </button>
          </div>
          {mobileOpen && (
            <div className="mt-3 space-y-3">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-xs text-gray-400 mb-1">{group.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`text-sm px-3 py-1 rounded border ${
                          isActive(item.href)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="w-full text-sm px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
