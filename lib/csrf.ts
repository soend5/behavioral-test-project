/**
 * CSRF 保护工具
 * 
 * 实现双重提交 Cookie 模式：
 * 1. 服务端生成 CSRF token 并设置到 cookie
 * 2. 客户端在请求头中携带相同的 token
 * 3. 服务端验证 cookie 和 header 中的 token 是否一致
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * 生成 CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * 从请求中获取 CSRF token（cookie）
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * 从请求中获取 CSRF token（header）
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * 验证 CSRF token
 * 比较 cookie 和 header 中的 token 是否一致
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // 使用时间安全的比较防止时序攻击
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * 时间安全的字符串比较
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 设置 CSRF cookie 到响应
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // 需要 JS 读取
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 小时
  });
}

/**
 * 需要 CSRF 保护的 HTTP 方法
 */
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * 不需要 CSRF 保护的路径前缀（公开 API）
 */
const CSRF_EXEMPT_PATHS = [
  "/api/auth/", // NextAuth 有自己的 CSRF 保护
  "/api/attempt/", // 公开测评 API，使用 token 验证
  "/api/public/", // 公开 API
  "/api/health", // 健康检查
];

/**
 * 检查路径是否需要 CSRF 保护
 */
export function requiresCsrfProtection(request: NextRequest): boolean {
  const method = request.method;
  const path = request.nextUrl.pathname;

  // 只保护特定 HTTP 方法
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return false;
  }

  // 检查是否在豁免列表中
  for (const exemptPath of CSRF_EXEMPT_PATHS) {
    if (path.startsWith(exemptPath)) {
      return false;
    }
  }

  return true;
}

/**
 * CSRF 保护中间件逻辑
 * 返回 true 表示验证通过，false 表示验证失败
 */
export function csrfProtection(request: NextRequest): boolean {
  if (!requiresCsrfProtection(request)) {
    return true;
  }

  return validateCsrfToken(request);
}
