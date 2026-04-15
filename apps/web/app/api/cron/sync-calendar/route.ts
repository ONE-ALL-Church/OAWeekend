import { NextResponse } from "next/server";
import { id } from "@instantdb/admin";
import adminDb from "@/lib/instant-admin";

/**
 * Daily cron to sync calendar data from Planning Center and Rock.
 * Creates missing weeks and prefills the next 8 Saturdays.
 *
 * Vercel Cron: configured in vercel.json
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const results = await Promise.all(
      weekStarts.map(async (ws) => {
        try {
          const res = await fetch(
            `${baseUrl}/api/calendar/week/${ws}/prefill-planning-center`,
            { method: "POST" },
          );
          const data = await res.json();
          return { week: ws, written: data.written ?? [], ok: true };
        } catch {
          return { week: ws, written: [], ok: false };
        }
      }),
    );

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
