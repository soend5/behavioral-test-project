/**
 * 速率限制工具
 * 基于内存的简单速率限制实现
 * 生产环境建议使用 Redis 实现
 */

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

export type RateLimitConfig = {
  /** 时间窗口内允许的最大请求数 */
  limit: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
};

/**
 * 检查速率限制
 * @param identifier 唯一标识符（如 IP 地址、用户 ID）
 * @param config 速率限制配置
 * @returns 速率限制结果
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // 如果没有记录或记录已过期，创建新记录
  if (!record || record.resetTime < now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // 检查是否超过限制
  if (record.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // 增加计数
  record.count += 1;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * 从请求中获取客户端标识符
 * @param request NextRequest 对象
 * @returns 客户端标识符
 */
export function getClientIdentifier(request: Request): string {
  // 优先使用 X-Forwarded-For（代理/CDN 场景）
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // 其次使用 X-Real-IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // 兜底使用固定值（本地开发）
  return "unknown";
}

// 预定义的速率限制配置
export const RATE_LIMITS = {
  /** 公开 API：每分钟 30 次 */
  public: { limit: 30, windowMs: 60000 },
  /** 认证 API：每分钟 10 次 */
  auth: { limit: 10, windowMs: 60000 },
  /** 提交 API：每分钟 5 次 */
  submit: { limit: 5, windowMs: 60000 },
} as const;
