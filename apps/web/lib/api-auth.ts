import { NextResponse, type NextRequest } from "next/server";
import adminDb from "@/lib/instant-admin";

export type ApiAuthActor = "cron" | "user";

export interface ApiAuthResult {
  ok: boolean;
  actor?: ApiAuthActor;
  userId?: string;
  response?: NextResponse;
}

export function hasValidCronBearer(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function requireCalendarWriteAccess(
  request: NextRequest,
): Promise<ApiAuthResult> {
  if (hasValidCronBearer(request)) {
    return { ok: true, actor: "cron" };
  }

  const instantToken = request.cookies.get("instant_token")?.value;
  if (instantToken) {
    try {
      const user = await adminDb.auth.verifyToken(instantToken);
      if (user?.id) {
        return { ok: true, actor: "user", userId: user.id };
      }
    } catch {
      // Token invalid or expired; fall through to 401.
    }
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
