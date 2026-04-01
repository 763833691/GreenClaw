import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/compute", "/assistant", "/reports"];
const AUTH_PAGES = ["/login", "/register"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthPath(pathname: string) {
  return AUTH_PAGES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get("gc_access")?.value;
  const refresh = request.cookies.get("gc_refresh")?.value;
  const hasSession = Boolean(access || refresh);

  // 旧侧栏占位链接，避免打开不存在的固定 ID
  if (pathname === "/projects/demo") {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/compute/:path*",
    "/assistant/:path*",
    "/reports/:path*",
    "/login",
    "/register"
  ]
};
