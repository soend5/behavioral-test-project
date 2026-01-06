"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links: Array<{ href: string; label: string }> = [
  { href: "/coach/dashboard", label: "客户" },
  { href: "/coach/invites", label: "邀请" },
  { href: "/coach/invites/new", label: "创建邀请" },
];

export function CoachNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/coach/dashboard" className="font-semibold">
            助教后台
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {links.map((l) => {
              const active = pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1 rounded ${
                    active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/coach/login" })}
          className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          退出
        </button>
      </div>
    </div>
  );
}

