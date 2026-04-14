import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }

  const rockBaseUrl = process.env.ROCK_BASE_URL;
  const rockApiKey = process.env.ROCK_API_KEY;
  if (!rockBaseUrl || !rockApiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const upstream = await fetch(`${rockBaseUrl}/GetImage.ashx?Id=${id}`, {
    headers: { "Authorization-Token": rockApiKey },
  });

  if (!upstream.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
