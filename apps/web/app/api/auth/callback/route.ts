import { NextRequest, NextResponse } from "next/server";
import adminDb from "@/lib/instant-admin";

/**
 * Handles the Rock RMS OIDC callback.
 * Exchanges the auth code for tokens, fetches user info,
 * creates an InstantDB auth token, and redirects to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  // Validate state
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

  const clientId = process.env.ROCK_CLIENT_ID!;
  const clientSecret = process.env.ROCK_CLIENT_SECRET!;
  const baseUrl = request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  try {
    // Exchange code for tokens
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
      const detail = encodeURIComponent(`${tokenRes.status}: ${text.slice(0, 300)}`);
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange&detail=${detail}`, request.url)
      );
    }

    const tokens = await tokenRes.json();

    // Fetch user info
    const userinfoRes = await fetch(
      "https://www.oneandall.church/Auth/UserInfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userinfoRes.ok) {
      console.error("UserInfo failed:", userinfoRes.status);
      return NextResponse.redirect(
        new URL("/login?error=userinfo", request.url)
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

    // Create InstantDB auth token
    const instantToken = await adminDb.auth.createToken(email);

    // Redirect to app with the InstantDB token
    const response = NextResponse.redirect(new URL("/operator", request.url));

    // Store the token in a cookie for the client to pick up
    response.cookies.set("instant_token", instantToken, {
      httpOnly: false, // Client JS needs to read this
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Store user name for display
    response.cookies.set("user_name", name ?? email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Clear the oauth state cookie
    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=server", request.url)
    );
  }
}
