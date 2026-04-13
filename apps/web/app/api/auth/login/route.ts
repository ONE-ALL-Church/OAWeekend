import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Initiates the Rock RMS OIDC login flow.
 * Generates a state parameter, stores it in a cookie, and redirects to Rock.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.ROCK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "ROCK_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const baseUrl = request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state,
  });

  const authorizeUrl = `https://www.oneandall.church/Auth/Authorize?${params}`;

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
