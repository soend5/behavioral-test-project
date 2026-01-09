"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CoachNav } from "../_components/CoachNav";
import { TodoPanel } from "../_components/TodoPanel";
import { CustomerFilter, defaultFilters, type FilterState } from "../_components/CustomerFilter";
import { MobileNav } from "../_components/MobileNav";
import { csrfFetch } from "@/lib/csrf-client";

type Customer = {
  id: string;
  name: string | null;
  nickname: string | null;
  phone: string | null;
  latestAttempt: { 
    id: string; 
    submittedAt: string | null; 
    status: string;
    stage?: string | null;
    archetype?: string | null;
  } | null;
  segments: string[];
  isHighRisk: boolean;
  updatedAt: string;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function CoachDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const [creating, setCreating] = useState(false);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // v2.1: 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(filters.segment && { segment: filters.segment }),
        ...(filters.archetype && { archetype: filters.archetype }),
        ...(filters.stage && { stage: filters.stage }),
        ...(filters.activity && { activity: filters.activity }),
      });
      
      const res = await fetch(`/api/coach/customers?${params}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiResponse<{
        customers: Customer[];
      }>;
      if (!json.ok) {
        setError(json.error.message);
        setCustomers([]);
        return;
      }
      setCustomers(json.data.customers);
    } catch {
      setError("加载失败");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filters]);

  async function createCustomer(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim() && !phone.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/coach/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim() || null,
          phone: phone.trim() || null,
          note: note.trim() || null,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ customer: unknown }>;
      if (!json.ok) {
        setError(json.error.message);
        setCreating(false);
        return;
      }
      setNickname("");
      setPhone("");
      setNote("");
      await load();
    } catch {
      setError("创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CoachNav />
      <div className="max-w-7xl mx-auto p-4">
        {/* V1.3: 待办面板 */}
        <TodoPanel />

        <h1 className="text-2xl font-bold mb-1">参与者档案</h1>
        <p className="text-sm text-gray-600 mb-4">
          用于管理参与者基本信息、测评状态与陪跑记录。
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">新建档案</h2>
          <form onSubmit={createCustomer} className="flex flex-wrap gap-3">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="昵称（可选）"
              className="border rounded px-3 py-2 w-56"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="手机号（可选）"
              className="border rounded px-3 py-2 w-56"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注（可选）"
              className="border rounded px-3 py-2 flex-1 min-w-[200px]"
            />
            <button
              type="submit"
              disabled={creating || (!nickname.trim() && !phone.trim())}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建档案"}
            </button>
          </form>
          {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
        </div>

        {/* v2.1: 筛选器 + 客户列表 */}
        <div className="flex gap-6">
          {/* 筛选器 */}
          <CustomerFilter
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
          />

          {/* 客户列表 */}
          <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
            {/* 批量操作栏 */}
            {selectedIds.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  已选择 {selectedIds.size} 个客户
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    取消选择
                  </button>
                  <button
                    onClick={() => {
                      const tag = prompt("输入要添加的标签（如 coach:vip）");
                      if (tag) {
                        // 调用批量 API
                        csrfFetch("/api/coach/customers/batch", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            customerIds: Array.from(selectedIds),
                            action: "addTag",
                            payload: { tagKey: tag },
                          }),
                        }).then(() => {
                          setSelectedIds(new Set());
                          void load();
                        });
                      }
                    }}
                    className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    批量添加标签
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div>加载中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === customers.length && customers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(customers.map(c => c.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="py-2 pr-2">参与者</th>
                      <th className="py-2 pr-2">手机号</th>
                      <th className="py-2 pr-2">最新测评</th>
                      <th className="py-2 pr-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr 
                        key={c.id} 
                        className={`border-b ${c.isHighRisk ? "bg-red-50 border-l-4 border-l-red-500" : ""}`}
                      >
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedIds);
                              if (e.target.checked) {
                                newSet.add(c.id);
                              } else {
                                newSet.delete(c.id);
                              }
                              setSelectedIds(newSet);
                            }}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            {c.isHighRisk && <span title="高风险客户">⚠️</span>}
                            <div>
                              <div className="font-medium">
                                {c.nickname || c.name || "未命名"}
                              </div>
                              <div className="text-xs text-gray-500">{c.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-2">{c.phone || "-"}</td>
                        <td className="py-2 pr-2">
                          {c.latestAttempt?.submittedAt
                            ? new Date(c.latestAttempt.submittedAt).toLocaleString()
                            : "-"}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/coach/clients/${c.id}`}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                              查看
                            </Link>
                            <Link
                              href={`/coach/invites/new?customerId=${encodeURIComponent(
                                c.id
                              )}`}
                              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              新建邀请
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!customers.length ? (
                  <p className="text-sm text-gray-500 mt-3">暂无档案</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* v2.1: 移动端底部导航 */}
      <MobileNav />
    </div>
  );
}

