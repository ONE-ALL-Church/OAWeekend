import { NextResponse } from "next/server";
import { getFeaturedEvents } from "@/lib/rock";

export async function GET() {
  try {
    const events = await getFeaturedEvents();
    return NextResponse.json({ events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Rock featured events error:", message);
    return NextResponse.json(
      { error: "Failed to fetch featured events from Rock RMS", detail: message },
      { status: 500 },
    );
  }
}
