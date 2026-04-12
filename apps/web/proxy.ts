import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/operator") ||
    pathname.startsWith("/capture") ||
    pathname === "/api/deepgram-token";

  if (!isProtected) return NextResponse.next();

  const authCookie = request.cookies.get("oa-auth");
  if (authCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/operator/:path*", "/capture/:path*", "/api/deepgram-token"],
};
