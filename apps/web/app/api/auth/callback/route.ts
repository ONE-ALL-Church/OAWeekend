import { NextRequest, NextResponse } from "next/server";
import adminDb from "@/lib/instant-admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_state", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=no_code", request.url)
    );
  }

  const clientId = process.env.ROCK_CLIENT_ID;
  const clientSecret = process.env.ROCK_CLIENT_SECRET;
  const baseUrl = request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  // Debug: surface env var presence
  if (!clientId || !clientSecret) {
    const detail = encodeURIComponent(
      `Missing env: clientId=${!!clientId}, clientSecret=${!!clientSecret}`
    );
    return NextResponse.redirect(
      new URL(`/login?error=config&detail=${detail}`, request.url)
    );
  }

  try {
    // Try client_secret_post first (credentials in body)
    const tokenRes = await fetch(
      "https://www.oneandall.church/Auth/Token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      const detail = encodeURIComponent(
        `${tokenRes.status}: ${text.slice(0, 200)} | id=${clientId.slice(0, 8)}... | uri=${redirectUri}`
      );
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange&detail=${detail}`, request.url)
      );
    }

    const tokens = await tokenRes.json();

    const userinfoRes = await fetch(
      "https://www.oneandall.church/Auth/UserInfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userinfoRes.ok) {
      const text = await userinfoRes.text();
      const detail = encodeURIComponent(
        `${userinfoRes.status}: ${text.slice(0, 200)}`
      );
      return NextResponse.redirect(
        new URL(`/login?error=userinfo&detail=${detail}`, request.url)
      );
    }

    const userinfo = await userinfoRes.json();
    const email = userinfo.email;
    const name = userinfo.name ?? userinfo.preferred_username;

    if (!email) {
      return NextResponse.redirect(
        new URL("/login?error=no_email", request.url)
      );
    }

    const instantToken = await adminDb.auth.createToken(email);

    const response = NextResponse.redirect(new URL("/operator", request.url));

    response.cookies.set("instant_token", instantToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("user_name", name ?? email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    const detail = encodeURIComponent(
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.redirect(
      new URL(`/login?error=server&detail=${detail}`, request.url)
    );
  }
}
