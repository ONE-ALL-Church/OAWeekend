import { NextResponse } from "next/server";
import { createTemporaryDeepgramKey } from "@/lib/deepgram";

export async function GET() {
  try {
    const key = await createTemporaryDeepgramKey();
    return NextResponse.json({ key });
  } catch (error) {
    console.error("Deepgram token error:", error);
    return NextResponse.json(
      { error: "Failed to create Deepgram token" },
      { status: 500 }
    );
  }
}
