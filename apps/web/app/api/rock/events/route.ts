import { NextResponse } from "next/server";
import { getFeaturedEvents } from "@/lib/rock";

export async function GET() {
  try {
    const events = await getFeaturedEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Rock featured events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured events" },
      { status: 500 },
    );
  }
}
