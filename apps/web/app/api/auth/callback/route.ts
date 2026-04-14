import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import adminDb from "@/lib/instant-admin";
import { isAuthorizedGroupMember } from "@/lib/rock";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  if (
    !state ||
    !storedState ||
    !timingSafeEqual(state, storedState)
  ) {
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
  const oidcBaseUrl = process.env.ROCK_OIDC_BASE_URL;
  const baseUrl = request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  if (!clientId || !clientSecret || !oidcBaseUrl) {
    console.error("Missing OAuth env vars:", {
      clientId: !!clientId,
      clientSecret: !!clientSecret,
      oidcBaseUrl: !!oidcBaseUrl,
    });
    return NextResponse.redirect(
      new URL("/login?error=config", request.url)
    );
  }

  try {
    const tokenRes = await fetch(`${oidcBaseUrl}/Token`, {
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
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("Token exchange failed:", tokenRes.status, text.slice(0, 500));
      return NextResponse.redirect(
        new URL("/login?error=token_exchange", request.url)
      );
    }

    const tokens = await tokenRes.json();

    const userinfoRes = await fetch(`${oidcBaseUrl}/UserInfo`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userinfoRes.ok) {
      console.error("UserInfo failed:", userinfoRes.status);
      return NextResponse.redirect(
        new URL("/login?error=userinfo", request.url)
      );
    }

    const userinfo = await userinfoRes.json();
    const sub = userinfo.sub as string | undefined;
    const email = userinfo.email;
    const name = userinfo.name ?? userinfo.preferred_username;

    if (!sub || !email) {
      return NextResponse.redirect(
        new URL("/login?error=no_identity", request.url)
      );
    }

    // Authorize via Rock RMS group membership using the immutable OIDC sub
    // (PersonAlias GUID) — never email, which is mutable and non-unique.
    let authorized = false;
    try {
      authorized = await isAuthorizedGroupMember(sub);
    } catch (err) {
      console.error("Rock group membership check failed:", err);
    }

    if (!authorized) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    // InstantDB createToken expects an email address as the identity.
    const instantToken = await adminDb.auth.createToken(email);

    const response = NextResponse.redirect(new URL("/operator", request.url));

    // instant_token must be JS-readable for the InstantDB client SDK.
    // XSS risk is mitigated by the Content-Security-Policy header in next.config.ts.
    response.cookies.set("instant_token", instantToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("user_name", name ?? email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=server", request.url)
    );
  }
}

/** Constant-time string comparison to prevent timing attacks on state param. */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Perform a dummy comparison to avoid leaking length via timing difference
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
