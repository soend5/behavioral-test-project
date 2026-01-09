export const PRODUCT_NAME_CN = "交易行为结构测评";

export const PRODUCT_TAGLINE_CN =
  "用于在推进不确定事项时，辅助对齐推进节奏与下一步沟通。";

export const COMPLIANCE_NOTICE_CN =
  "提示：本测评及结果用于生成行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。";

// V1.3: 邀请状态页文案
export const INVITE_STATUS_COPY = {
  completed: {
    title: "测评已完成",
    icon: "✓",
    description: "恭喜你完成了本次测评！你的回答已经生成了一份行为节奏快照。",
    nextStep: "下一步：查看结果概览，或联系助教获取更具体的陪跑建议。",
  },
  expired: {
    title: "邀请已过期",
    icon: "⏰",
    description: "这个邀请链接已经超过有效期。",
    nextStep: "如需重新测评，请联系你的助教获取新的邀请链接。",
  },
  active: {
    title: "准备开始",
    icon: "📋",
    description: "邀请有效，可以开始测评。",
    nextStep: "点击下方按钮开始测评。",
  },
  entered: {
    title: "测评进行中",
    icon: "✏️",
    description: "你已经开始了测评，可以继续完成。",
    nextStep: "点击下方按钮继续测评。",
  },
} as const;

// V1.3: 结果页文案
export const RESULT_PAGE_COPY = {
  summaryTitle: "一句话摘要",
  summaryIntro: "这份结果是你在推进不确定事情时的一次节奏快照。",
  archetypeTitle: "行为倾向",
  dimensionsTitle: "行为维度",
  highlightsTitle: "显著行为特征",
  nextStepTitle: "下一步建议",
  nextStepContent: "请联系助教，把这份概览作为沟通起点，获得更具体的下一步推进建议。",
  contactCoachTitle: "联系助教",
  noHighlights: "暂无可展示的行为点。你可以先完成测评，或联系助教协助核对状态。",
} as const;