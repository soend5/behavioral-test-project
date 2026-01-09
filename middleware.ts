import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { generateCsrfToken, getCsrfTokenFromCookie, setCsrfCookie, csrfProtection } from "@/lib/csrf";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin 路由保护
    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
      if (!token || token.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // Coach 路由保护
    if (path.startsWith("/coach") && !path.startsWith("/coach/login")) {
      if (!token || (token.role !== "coach" && token.role !== "admin")) {
        return NextResponse.redirect(new URL("/coach/login", req.url));
      }
    }

    // CSRF 保护（仅对需要认证的 API 路由）
    if (path.startsWith("/api/admin/") || path.startsWith("/api/coach/")) {
      if (!csrfProtection(req)) {
        return NextResponse.json(
          { ok: false, error: { code: "CSRF_INVALID", message: "CSRF token 验证失败" } },
          { status: 403 }
        );
      }
    }

    // 确保 CSRF cookie 存在
    const response = NextResponse.next();
    const existingToken = getCsrfTokenFromCookie(req);
    if (!existingToken && (path.startsWith("/admin") || path.startsWith("/coach"))) {
      const newToken = generateCsrfToken();
      setCsrfCookie(response, newToken);
    }

    return response;
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/coach/:path*",
    "/api/admin/:path*",
    "/api/coach/:path*",
  ],
};

