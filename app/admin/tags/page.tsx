"use client";

import { useState, useEffect, useMemo } from "react";
import { AdminNav } from "../_components/AdminNav";
import { getDisplayTag } from "@/lib/tag-display";

type TagInfo = {
  tag: string;
  labelCn: string;
  explanationCn: string;
  kind: string;
  usageCount: number;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

const TAG_CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "image", label: "画像标签" },
  { key: "stage", label: "阶段标签" },
  { key: "segment", label: "分层标签" },
  { key: "behavior", label: "行为标签" },
  { key: "coach", label: "助教标签" },
];

// 预定义的系统标签
const SYSTEM_TAGS = [
  // 画像标签（使用 image: 前缀）
  "image:rule_executor",
  "image:emotion_driven",
  "image:experience_reliant",
  "image:opportunity_seeker",
  "image:defensive_observer",
  "image:impulsive_reactor",
  // 稳定性标签
  "stability:high",
  "stability:medium",
  "stability:low",
  // 阶段标签
  "phase:fast_completed",
  "phase:pro_completed",
  // 行为标签（维度评分）
  "rule:high", "rule:medium", "rule:low",
  "risk:high", "risk:medium", "risk:low",
  "emotion:high", "emotion:medium", "emotion:low",
  "consistency:high", "consistency:medium", "consistency:low",
  "opportunity:high", "opportunity:medium", "opportunity:low",
  "experience:high", "experience:medium", "experience:low",
  // 分层标签
  "segment:high_potential",
  "segment:needs_attention",
  "segment:active",
  "segment:inactive",
  "segment:new",
  // 助教标签示例
  "coach:high_value",
  "coach:needs_attention",
  "coach:vip",
];

export default function TagsManagementPage() {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // 从预定义标签构建标签列表
    const tagList: TagInfo[] = [];
    
    for (const tag of SYSTEM_TAGS) {
      const display = getDisplayTag(tag);
      if (!display) continue;
      
      let kind = "other";
      if (tag.startsWith("image:")) kind = "image";
      else if (tag.startsWith("stability:") || tag.startsWith("phase:")) kind = "stage";
      else if (tag.startsWith("segment:")) kind = "segment";
      else if (tag.startsWith("coach:")) kind = "coach";
      else kind = "behavior";
      
      tagList.push({
        tag,
        labelCn: display.labelCn,
        explanationCn: display.explanationCn,
        kind,
        usageCount: 0,
      });
    }

    setTags(tagList);
    setLoading(false);
  }, []);

  // 加载使用统计
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/tags/stats");
        const json = await res.json() as ApiResponse<{ stats: Record<string, number> }>;
        if (json.ok) {
          setTags(prev => prev.map(t => ({
            ...t,
            usageCount: json.data.stats[t.tag] || 0,
          })));
        }
      } catch {
        // ignore
      }
    }
    void loadStats();
  }, []);

  const filteredTags = useMemo(() => {
    return tags.filter(t => {
      if (filterCategory !== "all" && t.kind !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.tag.toLowerCase().includes(q) || 
               t.labelCn.toLowerCase().includes(q) ||
               t.explanationCn.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tags, filterCategory, searchQuery]);

  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    tags.forEach(t => {
      stats[t.kind] = (stats[t.kind] || 0) + 1;
    });
    return stats;
  }, [tags]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto p-4">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">标签管理中心</h1>
            <p className="text-sm text-gray-600 max-w-2xl">
              统一管理系统中使用的所有标签。标签分为：画像标签（客户行为类型）、
              阶段标签（测评完成状态）、行为标签（各维度评分）、分层标签（客户价值分层）、
              助教标签（助教自定义标记）。点击分类卡片可筛选查看。
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {TAG_CATEGORIES.map(cat => (
            <div
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-colors ${
                filterCategory === cat.key ? "ring-2 ring-blue-500" : "hover:bg-gray-50"
              }`}
            >
              <div className="text-2xl font-bold">
                {cat.key === "all" ? tags.length : tagStats[cat.key] || 0}
              </div>
              <div className="text-sm text-gray-500">{cat.label}</div>
            </div>
          ))}
        </div>

        {/* 搜索 */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签..."
            className="w-full md:w-64 border rounded px-3 py-2"
          />
        </div>

        {/* 标签列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left border-b">
                <th className="py-3 px-4">标签 Key</th>
                <th className="py-3 px-4">显示名称</th>
                <th className="py-3 px-4">说明</th>
                <th className="py-3 px-4">分类</th>
                <th className="py-3 px-4">使用次数</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag) => (
                <tr key={tag.tag} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {tag.tag}
                    </code>
                  </td>
                  <td className="py-3 px-4 font-medium">{tag.labelCn}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                    {tag.explanationCn}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      tag.kind === "image" ? "bg-purple-100 text-purple-700" :
                      tag.kind === "stage" ? "bg-blue-100 text-blue-700" :
                      tag.kind === "segment" ? "bg-green-100 text-green-700" :
                      tag.kind === "coach" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {TAG_CATEGORIES.find(c => c.key === tag.kind)?.label || tag.kind}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {tag.usageCount > 0 ? tag.usageCount : "-"}
                  </td>
                </tr>
              ))}
              {filteredTags.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    未找到匹配的标签
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          共 {filteredTags.length} 个标签
        </div>
      </div>
    </div>
  );
}
