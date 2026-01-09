"use client";

import { getStageDisplay, getDisplayTag } from "@/lib/tag-display";

type Props = {
  archetype?: string;
  stage?: string | null;
  segment?: string;
  tags?: string[];
};

const ARCHETYPE_LABELS: Record<string, string> = {
  rule_executor: "规则执行型",
  impulsive_reactor: "冲动反应型",
  hesitant_observer: "犹豫观望型",
  overconfident_trader: "过度自信型",
  loss_averse_holder: "损失厌恶型",
  balanced_learner: "均衡学习型",
};

export function KeyInfoCard({ archetype, stage, segment, tags = [] }: Props) {
  const stageMeta = getStageDisplay(stage);
  const archetypeLabel = archetype ? ARCHETYPE_LABELS[archetype] || archetype : "未测评";
  
  // 从标签中提取分层信息
  const segmentTag = tags.find(t => t.startsWith("segment:"));
  const segmentLabel = segmentTag 
    ? getDisplayTag(segmentTag)?.labelCn || segment || "未分层"
    : segment || "未分层";

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4">
      <div className="text-xs text-blue-600 font-medium mb-3">🎯 关键信息</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">画像类型</div>
          <div className="font-semibold text-gray-900">{archetypeLabel}</div>
        </div>
        <div className="text-center border-x border-blue-100">
          <div className="text-xs text-gray-500 mb-1">陪跑阶段</div>
          <div className="font-semibold text-gray-900">
            {stageMeta.labelCn.replace("陪跑阶段：", "")}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">客户分层</div>
          <div className="font-semibold text-gray-900">{segmentLabel}</div>
        </div>
      </div>
    </div>
  );
}
