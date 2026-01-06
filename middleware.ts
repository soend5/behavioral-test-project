import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin 路由保护
    if (path.startsWith("/admin")) {
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

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // 公开路由不需要认证
        if (
          path === "/" ||
          path.startsWith("/t/") ||
          path.startsWith("/api/attempt")
        ) {
          return true;
        }

        // 登录页面不需要认证
        if (path === "/coach/login" || path === "/admin/login") {
          return true;
        }

        // 其他路由需要认证
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/coach/:path*",
    "/api/:path*",
  ],
};

