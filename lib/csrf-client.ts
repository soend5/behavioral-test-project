/**
 * 客户端 CSRF 工具
 * 用于在前端请求中自动携带 CSRF token
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * 从 cookie 中获取 CSRF token
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * 创建带 CSRF token 的 fetch 请求头
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) {
    return {};
  }
  return { [CSRF_HEADER_NAME]: token };
}

/**
 * 带 CSRF 保护的 fetch 封装
 * 自动在请求头中添加 CSRF token
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfHeaders = getCsrfHeaders();
  const headers = {
    ...csrfHeaders,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 带 CSRF 保护的 JSON POST 请求
 */
export async function csrfPost<T = unknown>(
  url: string,
  data: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message: string } }> {
  const response = await csrfFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

/**
 * 带 CSRF 保护的 JSON PATCH 请求
 */
export async function csrfPatch<T = unknown>(
  url: string,
  data: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message: string } }> {
  const response = await csrfFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

/**
 * 带 CSRF 保护的 DELETE 请求
 */
export async function csrfDelete<T = unknown>(
  url: string
): Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message: string } }> {
  const response = await csrfFetch(url, {
    method: "DELETE",
  });

  return response.json();
}
