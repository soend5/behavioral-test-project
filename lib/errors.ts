/**
 * 错误码枚举
 * 统一错误码定义，避免散落在各处
 */
export enum ErrorCode {
  // 认证相关
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  
  // 资源不存在
  NOT_FOUND = "NOT_FOUND",
  ATTEMPT_NOT_FOUND = "ATTEMPT_NOT_FOUND",
  
  // 请求参数错误
  BAD_REQUEST = "BAD_REQUEST",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  
  // 资源冲突
  CONFLICT = "CONFLICT",
  
  // 邀请相关
  INVITE_INVALID = "INVITE_INVALID",
  INVITE_EXPIRED_OR_COMPLETED = "INVITE_EXPIRED_OR_COMPLETED",
  
  // 测评相关
  ATTEMPT_ALREADY_SUBMITTED = "ATTEMPT_ALREADY_SUBMITTED",
  
  // 客户相关
  CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND",
  
  // 邀请相关
  INVITE_NOT_FOUND = "INVITE_NOT_FOUND",
  INVITE_ALREADY_EXPIRED = "INVITE_ALREADY_EXPIRED",
  
  // 输入验证
  INVALID_INPUT = "INVALID_INPUT",
  
  // 服务器错误
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * 错误码到 HTTP 状态码映射
 */
export function getHttpStatus(code: ErrorCode | string): number {
  const statusMap: Record<string, number> = {
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.ATTEMPT_NOT_FOUND]: 404,
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.INVITE_INVALID]: 400,
    [ErrorCode.INVITE_EXPIRED_OR_COMPLETED]: 400,
    [ErrorCode.ATTEMPT_ALREADY_SUBMITTED]: 400,
    [ErrorCode.CUSTOMER_NOT_FOUND]: 404,
    [ErrorCode.INVITE_NOT_FOUND]: 404,
    [ErrorCode.INVITE_ALREADY_EXPIRED]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.INTERNAL_ERROR]: 500,
  };
  return statusMap[code] || 400;
}

