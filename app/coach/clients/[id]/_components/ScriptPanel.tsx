"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfFetch } from "@/lib/csrf-client";

type Script = {
  id: string;
  name: string;
  category: string;
  triggerStage: string | null;
  triggerArchetype: string | null;
  triggerTags: string[];
  content: string;
  variables: string[];
  usageCount: number;
  relevanceScore: number;
};

type Props = {
  customerId: string;
  customerName?: string;
  archetype?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  首次沟通: "👋 首次沟通",
  跟进: "🔄 跟进",
  转化: "💰 转化",
  复测: "📊 复测",
};

export function ScriptPanel({ customerId, customerName, archetype }: Props) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coach/scripts?customerId=${customerId}`);
      const json = await res.json();
      if (json.ok) {
        setScripts(json.data.scripts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Render script content with variable substitution
  function renderContent(content: string): string {
    return content
      .replace(/\{\{customerName\}\}/g, customerName || "客户")
      .replace(/\{\{archetype\}\}/g, archetype || "");
  }

  async function copyScript(script: Script) {
    const content = renderContent(script.content);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(script.id);
      setTimeout(() => setCopied(null), 2000);

      // Record usage
      await csrfFetch(`/api/coach/scripts/${script.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
    } catch {
      // ignore
    }
  }

  // Group scripts by category
  const categories = Array.from(new Set(scripts.map((s) => s.category)));
  const filteredScripts = activeCategory
    ? scripts.filter((s) => s.category === activeCategory)
    : scripts;

  // Show top recommended scripts (relevanceScore > 0)
  const recommended = scripts.filter((s) => s.relevanceScore > 0).slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">💬 推荐话术</h3>

      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : scripts.length === 0 ? (
        <div className="text-sm text-gray-500">暂无话术模板</div>
      ) : (
        <>
          {/* Recommended section */}
          {recommended.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-blue-600 mb-2">🎯 智能推荐</div>
              <div className="space-y-2">
                {recommended.map((script) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    copied={copied === script.id}
                    onCopy={() => copyScript(script)}
                    renderContent={renderContent}
                    highlight
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-xs px-2 py-1 rounded ${
                activeCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-2 py-1 rounded ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Script list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredScripts.map((script) => (
              <ScriptCard
                key={script.id}
                script={script}
                copied={copied === script.id}
                onCopy={() => copyScript(script)}
                renderContent={renderContent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ScriptCard({
  script,
  copied,
  onCopy,
  renderContent,
  highlight,
}: {
  script: Script;
  copied: boolean;
  onCopy: () => void;
  renderContent: (content: string) => string;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded p-3 ${
        highlight ? "border-blue-200 bg-blue-50" : "bg-white"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-sm font-medium">{script.name}</span>
          <span className="text-xs text-gray-500 ml-2">
            使用 {script.usageCount} 次
          </span>
        </div>
        <button
          onClick={onCopy}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          {copied ? "已复制 ✓" : "复制"}
        </button>
      </div>
      <p
        className={`text-sm text-gray-600 ${expanded ? "" : "line-clamp-2"}`}
        onClick={() => setExpanded(!expanded)}
      >
        {renderContent(script.content)}
      </p>
      {script.content.length > 100 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 mt-1"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  );
}
