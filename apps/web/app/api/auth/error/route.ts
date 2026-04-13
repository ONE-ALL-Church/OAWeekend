import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");

  // Try to fetch providers to see if auth is working
  let providersInfo = "unknown";
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/auth/providers`);
    providersInfo = await res.text();
  } catch (e) {
    providersInfo = `fetch failed: ${e}`;
  }

  // Try discovery endpoint
  let discoveryInfo = "unknown";
  try {
    const res = await fetch(
      "https://www.oneandall.church/.well-known/openid-configuration"
    );
    discoveryInfo = `status: ${res.status}`;
  } catch (e) {
    discoveryInfo = `fetch failed: ${e}`;
  }

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <body style="font-family: monospace; padding: 40px; max-width: 800px;">
      <h1>Auth Error: ${error}</h1>
      <h2>Environment:</h2>
      <ul>
        <li>ROCK_CLIENT_ID: ${process.env.ROCK_CLIENT_ID ? "SET (" + process.env.ROCK_CLIENT_ID.slice(0, 8) + "...)" : "MISSING"}</li>
        <li>ROCK_CLIENT_SECRET: ${process.env.ROCK_CLIENT_SECRET ? "SET (" + process.env.ROCK_CLIENT_SECRET.length + " chars)" : "MISSING"}</li>
        <li>AUTH_SECRET: ${process.env.AUTH_SECRET ? "SET (" + process.env.AUTH_SECRET.length + " chars)" : "MISSING"}</li>
        <li>AUTH_URL: ${process.env.AUTH_URL ?? "NOT SET"}</li>
        <li>NODE_ENV: ${process.env.NODE_ENV}</li>
      </ul>
      <h2>Discovery endpoint:</h2>
      <pre>${discoveryInfo}</pre>
      <h2>Providers endpoint:</h2>
      <pre style="white-space: pre-wrap; word-break: break-all;">${providersInfo}</pre>
      <p><a href="/login">Back to login</a></p>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
