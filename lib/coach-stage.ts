/**
 * Coach 阶段推进机制（V1.2）
 * 利用 Customer.note 字段存储 coach_stage，避免修改 schema
 */

import { PrismaClient } from "@prisma/client";
import { safeJsonParse } from "./json";

export type CoachStage = "pre" | "mid" | "post";

export interface CoachMetadata {
  coach_stage?: CoachStage;
  coach_stage_updated_at?: string;
  [key: string]: unknown;
}

/**
 * 从 Customer.note 解析 coach metadata
 */
export function parseCoachMetadata(note: string | null | undefined): CoachMetadata {
  if (!note) return {};
  const parsed = safeJsonParse(note);
  if (parsed && typeof parsed === "object") {
    return parsed as CoachMetadata;
  }
  // 如果 note 不是 JSON，返回空对象（向后兼容）
  return {};
}

/**
 * 序列化 coach metadata 到 Customer.note
 */
export function serializeCoachMetadata(meta: CoachMetadata): string {
  return JSON.stringify(meta);
}

/**
 * 获取客户的 coach_stage（从 Customer.note 读取）
 */
export function getCoachStage(note: string | null | undefined): CoachStage {
  const meta = parseCoachMetadata(note);
  return meta.coach_stage || "pre";
}

/**
 * 设置客户的 coach_stage（写入 Customer.note）
 */
export async function setCoachStage(
  prisma: PrismaClient,
  customerId: string,
  newStage: CoachStage
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const meta = parseCoachMetadata(customer.note);
  meta.coach_stage = newStage;
  meta.coach_stage_updated_at = new Date().toISOString();

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      note: serializeCoachMetadata(meta),
    },
  });
}

/**
 * 推进 coach_stage（pre -> mid -> post，post 保持）
 */
export function advanceStage(currentStage: CoachStage): CoachStage {
  if (currentStage === "pre") return "mid";
  if (currentStage === "mid") return "post";
  return "post"; // post 保持
}
