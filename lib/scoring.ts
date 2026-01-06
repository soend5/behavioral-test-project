/**
 * 评分工具函数
 * MVP 版本：简单评分逻辑
 * 
 * 支持：
 * - fast 版本：主画像、稳定度、阶段标签
 * - pro 版本：六维条形图（risk, return, liquidity, stability, growth, diversification）
 */

interface Answer {
  questionId: string;
  optionId: string;
}

interface OptionScore {
  risk?: number;
  return?: number;
  liquidity?: number;
  stability?: number;
  growth?: number;
  diversification?: number;
  [key: string]: any;
}

/**
 * 计算测评分数和标签
 * @param answers 答案映射 { questionId: optionId }
 * @param options 选项列表（包含 scorePayloadJson）
 * @param version 测评版本 'fast' | 'pro'
 */
export async function calculateScores(
  answers: Record<string, string>,
  options: Array<{ id: string; scorePayloadJson: string | null }>,
  version: "fast" | "pro" = "fast"
): Promise<{
  scoresJson: string;
  tagsJson: string;
  stage: string;
  resultSummaryJson: string;
}> {
  // 解析所有选项的分数
  const optionScores: Record<string, OptionScore> = {};
  for (const opt of options) {
    if (opt.scorePayloadJson) {
      try {
        optionScores[opt.id] = JSON.parse(opt.scorePayloadJson);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  // 计算总分（支持六维）
  let totalRisk = 0;
  let totalReturn = 0;
  let totalLiquidity = 0;
  let totalStability = 0;
  let totalGrowth = 0;
  let totalDiversification = 0;
  let answerCount = 0;

  for (const [questionId, optionId] of Object.entries(answers)) {
    const score = optionScores[optionId];
    if (score) {
      totalRisk += score.risk || 0;
      totalReturn += score.return || 0;
      totalLiquidity += score.liquidity || 0;
      totalStability += score.stability || 0;
      totalGrowth += score.growth || 0;
      totalDiversification += score.diversification || 0;
      answerCount++;
    }
  }

  // 计算平均值
  const avgRisk = answerCount > 0 ? totalRisk / answerCount : 0;
  const avgReturn = answerCount > 0 ? totalReturn / answerCount : 0;
  const avgLiquidity = answerCount > 0 ? totalLiquidity / answerCount : 0;
  const avgStability = answerCount > 0 ? totalStability / answerCount : 0;
  const avgGrowth = answerCount > 0 ? totalGrowth / answerCount : 0;
  const avgDiversification = answerCount > 0 ? totalDiversification / answerCount : 0;

  // 生成标签
  const tags: string[] = [];

  // 画像标签（基于风险偏好）
  if (avgRisk < 30) {
    tags.push("image:conservative");
  } else if (avgRisk < 70) {
    tags.push("image:moderate");
  } else {
    tags.push("image:aggressive");
  }

  // 稳定度标签
  if (avgStability >= 70) {
    tags.push("stability:high");
  } else if (avgStability >= 40) {
    tags.push("stability:medium");
  } else {
    tags.push("stability:low");
  }

  // 阶段标签（根据版本）
  if (version === "fast") {
    tags.push("phase:fast_completed");
  } else {
    tags.push("phase:pro_completed");
  }

  // 确定阶段
  const stage = "pre"; // MVP 默认 pre

  // 构建分数 JSON（pro 版本包含六维）
  const scoresData: Record<string, number> = {
    risk: Math.round(avgRisk),
    return: Math.round(avgReturn),
    liquidity: Math.round(avgLiquidity),
    stability: Math.round(avgStability),
  };

  if (version === "pro") {
    scoresData.growth = Math.round(avgGrowth);
    scoresData.diversification = Math.round(avgDiversification);
  }

  const scoresJson = JSON.stringify(scoresData);

  // 构建标签 JSON
  const tagsJson = JSON.stringify(tags);

  // 构建结果摘要 JSON
  const resultSummary: any = {
    primaryImage:
      avgRisk < 30 ? "conservative" : avgRisk < 70 ? "moderate" : "aggressive",
    stability: avgStability >= 70 ? "high" : avgStability >= 40 ? "medium" : "low",
    dimensions: {
      risk: Math.round(avgRisk),
      return: Math.round(avgReturn),
      liquidity: Math.round(avgLiquidity),
      stability: Math.round(avgStability),
    },
  };

  // pro 版本添加六维条形图数据
  if (version === "pro") {
    resultSummary.dimensions.growth = Math.round(avgGrowth);
    resultSummary.dimensions.diversification = Math.round(avgDiversification);
  }

  const resultSummaryJson = JSON.stringify(resultSummary);

  return {
    scoresJson,
    tagsJson,
    stage,
    resultSummaryJson,
  };
}

