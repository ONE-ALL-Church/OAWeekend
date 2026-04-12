import { NextResponse } from "next/server";
import { getDeepgramKey } from "@/lib/deepgram";

export async function GET() {
  try {
    const key = getDeepgramKey();
    return NextResponse.json({ key });
  } catch (error) {
    console.error("Deepgram token error:", error);
    return NextResponse.json(
      { error: "Failed to create Deepgram token" },
      { status: 500 }
    );
  }
}
