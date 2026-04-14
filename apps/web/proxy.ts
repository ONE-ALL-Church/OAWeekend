import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/operator") ||
    pathname.startsWith("/capture") ||
    pathname === "/api/deepgram-token" ||
    pathname.startsWith("/api/rock/");

  if (!isProtected) return NextResponse.next();

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
