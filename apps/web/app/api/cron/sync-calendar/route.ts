import { NextResponse } from "next/server";
import { id } from "@instantdb/admin";
import adminDb from "@/lib/instant-admin";

const WEEK_SYNC_DELAY_MS = 3_000;

/**
 * Daily cron to sync calendar data from Planning Center and Rock.
 * Creates missing weeks and prefills the next 8 Saturdays.
 *
 * Vercel Cron: configured in vercel.json
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the next 8 Saturdays starting from today
    const today = new Date();
    const day = today.getDay();
    const diffToSaturday = (6 - day + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + diffToSaturday);

    // Also include 4 past Saturdays for backfill
    const startSaturday = new Date(nextSaturday);
    startSaturday.setDate(nextSaturday.getDate() - 28);

    const weekStarts: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(startSaturday);
      d.setDate(startSaturday.getDate() + i * 7);
      weekStarts.push(d.toISOString().slice(0, 10));
    }

    // Ensure all weeks exist in InstantDB
    const existing = await adminDb.query({
      calendarWeeks: {
        $: {
          where: {
            and: [
              { weekStart: { $gte: weekStarts[0]! } },
              { weekStart: { $lte: weekStarts[weekStarts.length - 1]! } },
            ],
          },
        },
      },
    });

    const existingWeekStarts = new Set(
      (existing.calendarWeeks ?? []).map((w) => w.weekStart),
    );

    const createdWeeks: string[] = [];
    for (const ws of weekStarts) {
      if (!existingWeekStarts.has(ws)) {
        const weekId = id();
        await adminDb.transact(
          adminDb.tx.calendarWeeks[weekId].update({
            weekStart: ws,
            label: "",
            createdAt: Date.now(),
          }),
        );
        createdWeeks.push(ws);
      }
    }

    // Prefill each week from PCO + Rock
    const baseUrl = new URL(request.url).origin;

    const results: Array<Awaited<ReturnType<typeof syncWeek>>> = [];
    for (const [index, ws] of weekStarts.entries()) {
      results.push(await syncWeek(baseUrl, ws, cronSecret));
      if (index < weekStarts.length - 1) {
        await sleep(WEEK_SYNC_DELAY_MS);
      }
    }

    return NextResponse.json({
      ok: true,
      createdWeeks,
      results,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}

async function syncWeek(baseUrl: string, weekStart: string, cronSecret: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/calendar/week/${weekStart}/prefill-planning-center`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${cronSecret}` },
      },
    );
    const body = await res.text();
    const data = body ? JSON.parse(body) : {};
    if (!res.ok) {
      return {
        week: weekStart,
        written: [],
        ok: false,
        status: res.status,
        error: data.error ?? body.slice(0, 200),
      };
    }
    return {
      week: weekStart,
      written: data.written ?? [],
      ok: true,
      status: res.status,
    };
  } catch (error) {
    return {
      week: weekStart,
      written: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown sync error",
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
