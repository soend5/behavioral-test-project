"use client";

import { useState, useEffect } from "react";
import { AdminNav } from "../../_components/AdminNav";

interface DependencyNode {
  id: string;
  type: "sop" | "script" | "tag" | "training";
  name: string;
  stage?: string;
}

interface DependencyEdge {
  source: string;
  target: string;
  relation: string;
}

interface DependencyData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

interface ConflictItem {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  details: {
    sourceType: string;
    sourceId: string;
    sourceName: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
  };
}

const NODE_COLORS: Record<string, string> = {
  sop: "bg-blue-100 border-blue-500 text-blue-800",
  script: "bg-green-100 border-green-500 text-green-800",
  tag: "bg-yellow-100 border-yellow-500 text-yellow-800",
  training: "bg-purple-100 border-purple-500 text-purple-800"
};

const NODE_LABELS: Record<string, string> = {
  sop: "SOP",
  script: "话术",
  tag: "标签",
  training: "训练"
};

const SEVERITY_COLORS: Record<string, string> = {
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-600"
};

export default function DependenciesPage() {
  const [data, setData] = useState<DependencyData | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchDependencies();
  }, []);

  async function fetchDependencies() {
    try {
      const res = await fetch("/api/admin/strategy/dependencies");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch dependencies:", err);
    } finally {
      setLoading(false);
    }
  }

  async function runValidation() {
    setValidating(true);
    try {
      const res = await fetch("/api/admin/config/validate");
      if (res.ok) {
        const json = await res.json();
        setConflicts(json.conflicts || []);
      }
    } catch (err) {
      console.error("Validation failed:", err);
    } finally {
      setValidating(false);
    }
  }

  const filteredNodes = data?.nodes.filter(
    n => selectedType === "all" || n.type === selectedType
  ) || [];

  const filteredEdges = data?.edges.filter(e => {
    if (selectedType === "all") return true;
    const sourceNode = data?.nodes.find(n => n.id === e.source);
    const targetNode = data?.nodes.find(n => n.id === e.target);
    return sourceNode?.type === selectedType || targetNode?.type === selectedType;
  }) || [];

  // 按阶段分组节点
  const nodesByStage = filteredNodes.reduce((acc, node) => {
    const stage = node.stage || "其他";
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(node);
    return acc;
  }, {} as Record<string, DependencyNode[]>);

  const stageOrder = ["认知期", "行动期", "巩固期", "其他"];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">配置依赖关系</h1>
          <p className="text-gray-500 mt-1">
            查看 SOP、话术、标签之间的关联关系
          </p>
        </div>
        <button
          onClick={runValidation}
          disabled={validating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {validating ? "检测中..." : "🔍 冲突检测"}
        </button>
      </div>

      {/* 冲突提示 */}
      {conflicts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-red-600">
            发现 {conflicts.length} 个问题
          </h2>
          {conflicts.map((c, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${SEVERITY_COLORS[c.severity]}`}
            >
              <div className="flex items-center gap-2">
                <span>
                  {c.severity === "error" ? "❌" : c.severity === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <span className="font-medium">{c.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 筛选器 */}
      <div className="flex gap-2">
        {["all", "sop", "script", "tag"].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              selectedType === type
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {type === "all" ? "全部" : NODE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(NODE_LABELS).map(([type, label]) => {
          const count = data?.nodes.filter(n => n.type === type).length || 0;
          return (
            <div
              key={type}
              className={`p-4 rounded-lg border-2 ${NODE_COLORS[type]}`}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm">{label}</div>
            </div>
          );
        })}
      </div>

      {/* 依赖关系图（简化列表视图） */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-4">依赖关系</h2>
        
        {stageOrder.map(stage => {
          const stageNodes = nodesByStage[stage];
          if (!stageNodes?.length) return null;
          
          return (
            <div key={stage} className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2 border-b pb-1">
                {stage}
              </h3>
              <div className="space-y-2">
                {stageNodes.map(node => {
                  const relatedEdges = filteredEdges.filter(
                    e => e.source === node.id || e.target === node.id
                  );
                  
                  return (
                    <div
                      key={node.id}
                      className={`p-3 rounded-lg border-l-4 ${NODE_COLORS[node.type]}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/50 mr-2">
                            {NODE_LABELS[node.type]}
                          </span>
                          <span className="font-medium">{node.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {relatedEdges.length} 个关联
                        </span>
                      </div>
                      
                      {relatedEdges.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          {relatedEdges.slice(0, 3).map((edge, i) => {
                            const isSource = edge.source === node.id;
                            const relatedId = isSource ? edge.target : edge.source;
                            const relatedNode = data?.nodes.find(n => n.id === relatedId);
                            
                            return (
                              <div key={i} className="flex items-center gap-1">
                                <span>{isSource ? "→" : "←"}</span>
                                <span className="text-xs px-1 rounded bg-gray-100">
                                  {relatedNode ? NODE_LABELS[relatedNode.type] : ""}
                                </span>
                                <span>{relatedNode?.name || relatedId}</span>
                                <span className="text-gray-400">({edge.relation})</span>
                              </div>
                            );
                          })}
                          {relatedEdges.length > 3 && (
                            <div className="text-gray-400">
                              +{relatedEdges.length - 3} 更多...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
