import { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * 写入审计日志
 * @param prisma PrismaClient 实例
 * @param actorUserId 操作人用户 ID（可为 null，如 client 端操作）
 * @param action 操作类型
 * @param targetType 目标类型
 * @param targetId 目标 ID
 * @param metaJson 元数据 JSON 对象
 */
export async function writeAudit(
  prisma: DbClient,
  actorUserId: string | null,
  action: string,
  targetType: string | null = null,
  targetId: string | null = null,
  metaJson: Record<string, any> | null = null
) {
  try {
    // 如果没有 actorUserId，跳过写入（client 端操作可能没有用户 ID）
    if (!actorUserId) {
      return;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        targetType,
        targetId,
        metaJson: metaJson ? JSON.stringify(metaJson) : null,
      },
    });
  } catch (error) {
    // 审计日志写入失败不应影响主流程
    console.error("Failed to write audit log:", error);
  }
}

