import { NextResponse } from "next/server";
import { getCampuses } from "@/lib/rock";

export async function GET() {
  try {
    const campuses = await getCampuses();
    return NextResponse.json(campuses);
  } catch (error) {
    console.error("Rock campuses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campuses from Rock RMS" },
      { status: 500 }
    );
  }
}
