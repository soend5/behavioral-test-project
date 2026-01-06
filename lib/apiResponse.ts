import { NextResponse } from "next/server";
import { ErrorCode, getHttpStatus } from "./errors";

/**
 * 统一 API 响应工具
 * 所有 API route 必须使用此工具返回响应
 */

/**
 * 成功响应
 */
export function ok(data: any, statusCode: number = 200) {
  return NextResponse.json({ ok: true, data }, { status: statusCode });
}

/**
 * 失败响应
 * @param code 错误码（使用 ErrorCode 枚举）
 * @param message 错误消息
 * @param statusCode 可选，不提供则根据错误码自动映射
 */
export function fail(
  code: ErrorCode | string,
  message: string,
  statusCode?: number
) {
  const httpStatus = statusCode || getHttpStatus(code);
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status: httpStatus }
  );
}

