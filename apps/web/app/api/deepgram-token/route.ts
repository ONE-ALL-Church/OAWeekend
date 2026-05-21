import { NextRequest, NextResponse } from "next/server";
import { createTemporaryDeepgramKey } from "@/lib/deepgram";
import adminDb from "@/lib/instant-admin";

interface DeepgramTokenRequest {
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Prefer the user_sub cookie (set by the auth callback). Fall back to
    // verifying the instant_token JWT for sessions that were started before
    // user_sub was introduced, so those users aren't unexpectedly locked out.
    let userSub = request.cookies.get("user_sub")?.value;

    if (!userSub) {
      const instantToken = request.cookies.get("instant_token")?.value;
      if (instantToken) {
        try {
          const user = await adminDb.auth.verifyToken(instantToken);
          userSub = user?.id;
        } catch {
          // Token invalid or expired — fall through to the 401 below
        }
      }
    }

    if (!userSub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as DeepgramTokenRequest | null;
    const sessionId = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const data = await adminDb.query({
      sessions: {
        $: { where: { id: sessionId } },
      },
    });

    const session = data.sessions?.[0];
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.createdBy !== userSub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.status !== "idle" && session.status !== "live" && session.status !== "ended") {
      return NextResponse.json(
        { error: "Session is not capture-ready" },
        { status: 409 }
      );
    }

    const token = await createTemporaryDeepgramKey();
    return NextResponse.json({ token });
  } catch (error) {
    console.error("[deepgram-token]", error);
    return NextResponse.json(
      { error: "Failed to create Deepgram token" },
      { status: 500 }
    );
  }
}
