import { NextRequest, NextResponse } from "next/server";

// Dev-only auth bypass. Double-guarded: requires BOTH
//   - NODE_ENV !== 'production'
//   - DEV_AUTH_BYPASS === 'true'
// The NODE_ENV check means a production build will never respect this flag
// even if the env var is accidentally set.
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/operator") ||
    pathname.startsWith("/capture") ||
    pathname === "/api/deepgram-token" ||
    pathname.startsWith("/api/rock/");

  if (!isProtected) return NextResponse.next();

  if (DEV_AUTH_BYPASS) {
    return NextResponse.next();
  }

  const token = request.cookies.get("instant_token");
  if (token?.value) {
    return NextResponse.next();
  }

  // API routes get 401; pages get redirected to login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/operator/:path*",
    "/capture/:path*",
    "/api/deepgram-token",
    "/api/rock/:path*",
  ],
};
