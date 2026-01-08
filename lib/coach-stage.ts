/**
 * Coach 阶段推进机制（V1.2）
 * 利用 Customer.note 字段存储 coach_stage，避免修改 schema
 *
 * ⚠️ 注意：Customer.note 在现有系统中也承载“备注”（纯文本）。
 * 为避免数据丢失：
 * - 若 note 为纯文本（或不是本机制的 JSON），会被保存在 note_text 中
 * - 写入 coach_stage 时会序列化为 JSON（包含 note_text），从而保留原备注
 */

import { PrismaClient } from "@prisma/client";
import { safeJsonParse } from "./json";

export type CoachStage = "pre" | "mid" | "post";

export interface CoachMetadata {
  /**
   * 用户在 UI 中输入的“备注”文本。
   * 当 Customer.note 为纯文本时，会在写入阶段信息时被迁移到此字段以保留内容。
   */
  note_text?: string;
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

  // 仅当 note 明确包含本机制字段（coach_stage / coach_stage_updated_at / note_text）时，才视为 metadata JSON。
  // 其他情况（纯文本、数组、或任意 JSON）一律当作“备注文本”处理，避免误判导致覆盖/丢失。
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const looksLikeCoachMetadata =
      "coach_stage" in obj || "coach_stage_updated_at" in obj || "note_text" in obj;
    if (looksLikeCoachMetadata) {
      return obj as CoachMetadata;
    }
  }

  return { note_text: note };
}

/**
 * 序列化 coach metadata 到 Customer.note
 */
export function serializeCoachMetadata(meta: CoachMetadata): string {
  return JSON.stringify(meta);
}

/**
 * 获取用于展示的“备注文本”（不会返回 metadata JSON 本体）
 */
export function getCoachNoteText(note: string | null | undefined): string | null {
  if (!note) return null;
  const meta = parseCoachMetadata(note);
  if (typeof meta.note_text === "string") return meta.note_text;
  return null;
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
