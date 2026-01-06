import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

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

    return NextResponse.next();
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
  ],
};

