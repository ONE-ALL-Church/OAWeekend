import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.ROCK_CLIENT_ID;
  const oidcBaseUrl = process.env.ROCK_OIDC_BASE_URL;

  if (!clientId || !oidcBaseUrl) {
    return NextResponse.json(
      { error: "OAuth not configured" },
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

  const authorizeUrl = `${oidcBaseUrl}/Authorize?${params}`;

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
