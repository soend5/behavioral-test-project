"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const navItems: NavItem[] = [
  { href: "/admin", label: "总览" },
  { href: "/admin/settings", label: "系统设置" },
  { href: "/admin/quiz", label: "题库" },
  { href: "/admin/sop", label: "SOP 配置" },
  { href: "/admin/archetypes", label: "画像文案" },
  { href: "/admin/training-handbook", label: "内训手册" },
  { href: "/admin/methodology", label: "方法论" },
  { href: "/admin/coaches", label: "助教账号" },
  { href: "/admin/audit", label: "审计日志" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
        <div className="font-semibold mr-2">管理后台</div>
        <div className="flex flex-wrap gap-2 items-center flex-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm px-3 py-1 rounded border ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white hover:bg-gray-50 border-gray-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
