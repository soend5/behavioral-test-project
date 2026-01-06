import { NextResponse } from "next/server";

/**
 * 创建成功响应
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400
) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

/**
 * 错误码到 HTTP 状态码映射
 */
function getHttpStatus(code: string): number {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
    CONFLICT: 409,
    INVITE_INVALID: 400,
    INVITE_EXPIRED_OR_COMPLETED: 400,
    ATTEMPT_NOT_FOUND: 404,
    ATTEMPT_ALREADY_SUBMITTED: 400,
    VALIDATION_ERROR: 400,
    INTERNAL_ERROR: 500,
  };
  return statusMap[code] || 400;
}

/**
 * 创建标准错误响应（自动映射HTTP状态码）
 */
export function createStandardErrorResponse(code: string, message: string) {
  return createErrorResponse(code, message, getHttpStatus(code));
}

