export const PRODUCT_NAME_CN = "交易行为结构测评";

export const PRODUCT_TAGLINE_CN =
  "用于在推进不确定事项时，辅助对齐推进节奏与下一步沟通。";

// v1.5: 简化合规提示，移至页面底部
export const COMPLIANCE_NOTICE_CN =
  "本测评帮你看清操作习惯，不涉及投资建议";

// v1.5: 完整版合规提示（用于需要详细说明的场景）
export const COMPLIANCE_NOTICE_FULL_CN =
  "提示：本测评及结果用于生成行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。";

// v1.9: 分场景合规提示
export const COMPLIANCE_NOTICES = {
  coach_panel: "以下为沟通参考，请勿作为投资建议",
  result_page: "这是你的行为结构画像，用于和助教对齐下一步",
  landing_page: "本测评帮你看清操作习惯，不涉及投资建议",
} as const;

// v1.5: 落地页文案
export const LANDING_PAGE_COPY = {
  title: "3分钟，看清你炒股时最容易在哪一步乱动",
  subtitle: "完成测评后，你的专属助教会帮你解读结果",
  startButton: "开始测评",
  continueButton: "继续测评",
} as const;

// v1.5: 测评页文案
export const QUIZ_PAGE_COPY = {
  title: "快速测评",
  progressText: (current: number, total: number) => `已完成 ${current}/${total} 题`,
  estimatedTime: (minutes: number) => `预计还需 ${minutes} 分钟`,
  submitButton: "提交测评",
  submittingButton: "提交中...",
  encouragement: [
    "继续保持，马上就好！",
    "你的回答很有价值，继续！",
    "快完成了，加油！",
  ],
} as const;

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

// v1.5: 结果页文案（重构版）
export const RESULT_PAGE_COPY = {
  // 首屏核心
  summaryTitle: "一句话摘要",
  summaryIntro: "这份结果是你在推进不确定事情时的一次节奏快照。",
  archetypeTitle: "行为倾向",
  dimensionsTitle: "行为维度",
  highlightsTitle: "你的核心特点",
  
  // CTA区域
  nextStepTitle: "想知道怎么用好这个特点？",
  nextStepContent: "联系你的专属助教，获取个性化的解读和建议",
  contactCoachTitle: "联系助教",
  contactCoachButton: "联系助教获取解读",
  
  // 详细报告
  detailTitle: "查看详细报告",
  noHighlights: "暂无可展示的行为点。你可以先完成测评，或联系助教协助核对状态。",
} as const;