"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/quiz", label: "Quizzes" },
  { href: "/admin/sop", label: "SOP Config" },
  { href: "/admin/archetypes", label: "Archetypes" },
  { href: "/admin/training-handbook", label: "Training Handbook" },
  { href: "/admin/methodology", label: "Methodology" },
  { href: "/admin/coaches", label: "Coaches" },
  { href: "/admin/audit", label: "Audit" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
        <div className="font-semibold mr-2">Admin</div>
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
          Sign out
        </button>
      </div>
    </div>
  );
}

