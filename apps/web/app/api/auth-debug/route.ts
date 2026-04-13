import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, string> = {};

  // Check env
  results.clientId = process.env.ROCK_CLIENT_ID ?? "MISSING";
  results.clientSecretLen = String(process.env.ROCK_CLIENT_SECRET?.length ?? 0);
  results.authSecret = process.env.AUTH_SECRET ? "SET" : "MISSING";

  // Try to import and initialize auth
  try {
    const { handlers } = await import("@/auth");
    results.handlersLoaded = "yes";
  } catch (e: any) {
    results.handlersLoaded = `ERROR: ${e.message}`;
    results.stack = e.stack?.slice(0, 500);
  }

  // Try fetching our own providers endpoint
  try {
    const res = await fetch(
      `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/auth/providers`
    );
    results.providersStatus = String(res.status);
    results.providersBody = (await res.text()).slice(0, 200);
  } catch (e: any) {
    results.providersFetch = `ERROR: ${e.message}`;
  }

  // Try fetching our own csrf endpoint
  try {
    const res = await fetch(
      `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/auth/csrf`
    );
    results.csrfStatus = String(res.status);
    const csrf = await res.json();
    results.csrfToken = csrf.csrfToken ? "present" : "missing";

    // Now try POST to signin
    const signinRes = await fetch(
      `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/auth/signin/rock`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: res.headers.get("set-cookie") ?? "",
        },
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken,
          json: "true",
        }),
        redirect: "manual",
      }
    );
    results.signinStatus = String(signinRes.status);
    results.signinLocation = signinRes.headers.get("location")?.slice(0, 200) ?? "none";
    if (signinRes.status === 200) {
      results.signinBody = (await signinRes.text()).slice(0, 300);
    }
  } catch (e: any) {
    results.signinError = `ERROR: ${e.message}`;
  }

  return NextResponse.json(results, { status: 200 });
}
