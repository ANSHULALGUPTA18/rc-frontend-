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

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest): NextResponse {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)",
  ],
};
