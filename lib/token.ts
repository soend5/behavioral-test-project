import crypto from "crypto";

/**
 * Token 工具函数
 * - token 只存 hash 到数据库
 * - 任何接口不可回写 token 明文
 */

/**
 * 将原始 token 哈希化（使用 SHA256）
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 生成新的邀请 token（仅用于创建邀请）
 * 返回原始 token，需要调用 hashToken 后存储到数据库
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

