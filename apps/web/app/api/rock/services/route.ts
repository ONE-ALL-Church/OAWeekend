import { NextResponse } from "next/server";
import { getCampuses, getWeekendServices } from "@/lib/rock";

export async function GET() {
  try {
    const [campuses, services] = await Promise.all([
      getCampuses(),
      getWeekendServices(),
    ]);

    return NextResponse.json({
      campuses: campuses.map((c) => ({
        id: c.id,
        name: c.name,
        shortCode: c.shortCode ?? null,
      })),
      services,
    });
  } catch (error) {
    console.error("Rock services error:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
