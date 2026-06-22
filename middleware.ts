/**
 * Next.js Edge Middleware — first-line route protection.
 *
 * Only does ONE thing: blocks unauthenticated requests to protected routes
 * by checking for the "rc_session" cookie.
 *
 * It does NOT redirect authenticated users away from /login.
 * That job belongs to AzureLoginPanel (which uses useIsAuthenticated()).
 * Doing it here caused an infinite redirect loop:
 *   cookie exists → /login → redirect to /dashboard
 *   Azure not ready yet → AuthGuard sends back to /login
 *   cookie still exists → /dashboard → ... repeat
 *
 * The "rc_session" cookie is:
 *   - Set by AuthGuard after Azure login completes
 *   - Set by setToken() after mock login completes
 *   - Cleared by clearSessionCookie() on logout or when auth check fails
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest): NextResponse {
  // Auth kill-switch — skip all auth checks, auto-set session cookie
  if (AUTH_DISABLED) {
    const res = NextResponse.next();
    if (!request.cookies.has("rc_session")) {
      res.cookies.set("rc_session", "1", { path: "/", sameSite: "strict", maxAge: 28800 });
    }
    // Redirect /login → /dashboard when auth is off (nothing to log into)
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return res;
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession = request.cookies.has("rc_session");

  if (!isPublic && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
