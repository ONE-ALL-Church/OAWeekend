import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");

  // Return the error as visible HTML so we can debug
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <body style="font-family: monospace; padding: 40px;">
      <h1>Auth Error: ${error}</h1>
      <p>Full URL: ${request.nextUrl.toString()}</p>
      <h2>Environment Check:</h2>
      <ul>
        <li>ROCK_CLIENT_ID: ${process.env.ROCK_CLIENT_ID ? "SET (" + process.env.ROCK_CLIENT_ID.slice(0, 8) + "...)" : "MISSING"}</li>
        <li>ROCK_CLIENT_SECRET: ${process.env.ROCK_CLIENT_SECRET ? "SET (" + process.env.ROCK_CLIENT_SECRET.length + " chars)" : "MISSING"}</li>
        <li>AUTH_SECRET: ${process.env.AUTH_SECRET ? "SET (" + process.env.AUTH_SECRET.length + " chars)" : "MISSING"}</li>
        <li>AUTH_URL: ${process.env.AUTH_URL ?? "NOT SET"}</li>
      </ul>
      <p><a href="/login">Back to login</a></p>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
