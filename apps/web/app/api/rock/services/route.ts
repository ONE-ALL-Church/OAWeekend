import { NextResponse } from "next/server";
import { getTodaysServices, getActiveSermonItems } from "@/lib/rock";

export async function GET() {
  try {
    const [services, sermonItems] = await Promise.all([
      getTodaysServices(),
      getActiveSermonItems(),
    ]);

    return NextResponse.json({ services, sermonItems });
  } catch (error) {
    console.error("Rock services error:", error);
    return NextResponse.json(
      { error: "Failed to fetch services from Rock RMS" },
      { status: 500 }
    );
  }
}
