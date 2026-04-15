import { NextResponse } from "next/server";
import { id } from "@instantdb/admin";
import adminDb from "@/lib/instant-admin";
import {
  extractWeekNumber,
  getWeekendPlansForWeek,
  type PlanningCenterPerson,
} from "@/lib/planning-center";

function jsonText(value: string) {
  return JSON.stringify({ value });
}

function jsonPeople(people: PlanningCenterPerson[]) {
  return JSON.stringify({
    people: people.map((p) => ({
      name: p.name,
      initials: buildInitials(p.name),
      rockPersonId: null,
      photoUrl: p.photoUrl ?? null,
    })),
  });
}

function jsonSeries(seriesId: string, seriesName: string, weekNumber: number | null) {
  return JSON.stringify({
    seriesId,
    weekNumber: weekNumber ?? 0,
    label: seriesName,
  });
}

function buildInitials(name: string) {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function hasMeaningfulContent(content?: string | null) {
  if (!content || content === "{}") return false;

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed?.value === "string") {
      return parsed.value.trim().length > 0;
    }
    if (typeof parsed?.value === "boolean") {
      return true;
    }
    if (Array.isArray(parsed?.people)) {
      return parsed.people.length > 0;
    }
    if (Array.isArray(parsed?.tags)) {
      return parsed.tags.length > 0;
    }
    if (Array.isArray(parsed?.campuses)) {
      return parsed.campuses.length > 0;
    }
    if (typeof parsed?.seriesId === "string") {
      return parsed.seriesId.trim().length > 0;
    }
    return false;
  } catch {
    return content.trim().length > 0;
  }
}

function upsertEntry(
  txs: unknown[],
  opts: {
    rowId: string;
    weekId: string;
    content: string;
    existing: { id: string; content: string } | undefined;
  },
) {
  if (opts.existing && hasMeaningfulContent(opts.existing.content)) {
    return false; // skipped
  }

  if (opts.existing) {
    txs.push(
      adminDb.tx.calendarEntries[opts.existing.id].update({
        content: opts.content,
        status: "draft",
        source: "planning-center",
        updatedAt: Date.now(),
        updatedBy: "planning-center-prefill",
      }),
    );
  } else {
    const entryId = id();
    txs.push(
      adminDb.tx.calendarEntries[entryId].update({
        content: opts.content,
        status: "draft",
        source: "planning-center",
        updatedAt: Date.now(),
        updatedBy: "planning-center-prefill",
      }),
      adminDb.tx.calendarEntries[entryId].link({ week: opts.weekId }),
      adminDb.tx.calendarEntries[entryId].link({ row: opts.rowId }),
    );
  }
  return true; // written
}

async function ensureSeriesForWeek(
  weekId: string,
  weekStart: string,
  seriesName: string,
) {
  const existing = await adminDb.query({
    calendarSeries: {
      $: { where: { name: seriesName } },
      weeks: {},
    },
  });

  const matchingSeries = (existing.calendarSeries ?? [])[0];
  if (matchingSeries) {
    const txs: Parameters<typeof adminDb.transact>[0] = [];
    const nextStartWeek =
      matchingSeries.startWeek && matchingSeries.startWeek < weekStart
        ? matchingSeries.startWeek
        : weekStart;
    const nextEndWeek =
      matchingSeries.endWeek && matchingSeries.endWeek > weekStart
        ? matchingSeries.endWeek
        : weekStart;

    txs.push(
      adminDb.tx.calendarSeries[matchingSeries.id].update({
        startWeek: nextStartWeek,
        endWeek: nextEndWeek,
      }),
    );

    const alreadyLinked = (matchingSeries.weeks ?? []).some(
      (linkedWeek) => linkedWeek.id === weekId,
    );
    if (!alreadyLinked) {
      txs.push(adminDb.tx.calendarSeries[matchingSeries.id].link({ weeks: weekId }));
    }

    await adminDb.transact(txs);
    return matchingSeries.id;
  }

  const seriesId = id();
  await adminDb.transact([
    adminDb.tx.calendarSeries[seriesId].update({
      name: seriesName,
      description: "",
      color: "#FFC905",
      startWeek: weekStart,
      endWeek: weekStart,
      createdAt: Date.now(),
    }),
    adminDb.tx.calendarSeries[seriesId].link({ weeks: weekId }),
  ]);
  return seriesId;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ weekStart: string }> },
) {
  try {
    const { weekStart } = await context.params;

    const [calendarData, planningCenter] = await Promise.all([
      adminDb.query({
        calendarSections: {
          rows: {},
        },
        calendarWeeks: {
          $: { where: { weekStart } },
          entries: {
            row: {},
          },
          series: {},
        },
      }),
      getWeekendPlansForWeek(weekStart),
    ]);

    const week = calendarData.calendarWeeks?.[0];
    if (!week) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    const rowsBySlug = new Map<string, { id: string; fieldType: string }>();
    for (const section of calendarData.calendarSections ?? []) {
      for (const row of section.rows ?? []) {
        rowsBySlug.set(row.slug, { id: row.id, fieldType: row.fieldType });
      }
    }

    const entriesByRowId = new Map<string, { id: string; content: string }>();
    for (const entry of week.entries ?? []) {
      if (entry.row?.id) {
        entriesByRowId.set(entry.row.id, {
          id: entry.id,
          content: entry.content,
        });
      }
    }

    const txs: Parameters<typeof adminDb.transact>[0] = [];
    const written: string[] = [];
    const skipped: string[] = [];

    const sanDimasPlan = planningCenter.sanDimas;
    const campusPlans = [
      planningCenter.sanDimas,
      planningCenter.ranchoCucamonga,
      planningCenter.westCovina,
    ];

    const songs = sanDimasPlan?.songs ?? [];
    songs.slice(0, 4).forEach((song, index) => {
      const slug = `song-${index + 1}`;
      const row = rowsBySlug.get(slug);
      if (!row) return;
      const didWrite = upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonText(song.title),
        existing: entriesByRowId.get(row.id),
      });
      (didWrite ? written : skipped).push(slug);
    });

    // Host — write per-campus sub-rows
    const campusHostSlugs: Record<string, string> = {
      "San Dimas": "host-san-dimas",
      "Rancho Cucamonga": "host-rancho",
      "West Covina": "host-west-covina",
    };

    for (const plan of campusPlans) {
      if (!plan) continue;
      const slug = campusHostSlugs[plan.campusName];
      if (!slug) continue;
      const row = rowsBySlug.get(slug);
      if (!row || plan.hosts.length === 0) continue;

      const didWrite = upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonPeople(plan.hosts),
        existing: entriesByRowId.get(row.id),
      });
      (didWrite ? written : skipped).push(slug);
    }

    // Worship Leader — write per-campus sub-rows
    const campusWLSlugs: Record<string, string> = {
      "San Dimas": "worship-leader-san-dimas",
      "Rancho Cucamonga": "worship-leader-rancho",
      "West Covina": "worship-leader-west-covina",
    };

    for (const plan of campusPlans) {
      if (!plan) continue;
      const slug = campusWLSlugs[plan.campusName];
      if (!slug) continue;
      const row = rowsBySlug.get(slug);
      if (!row || plan.worshipLeaders.length === 0) continue;

      const didWrite = upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonPeople(plan.worshipLeaders),
        existing: entriesByRowId.get(row.id),
      });
      (didWrite ? written : skipped).push(slug);
    }

    const seriesTitle =
      sanDimasPlan?.seriesTitle ??
      planningCenter.ranchoCucamonga?.seriesTitle ??
      planningCenter.westCovina?.seriesTitle ??
      null;

    if (seriesTitle) {
      const seriesId = await ensureSeriesForWeek(week.id, weekStart, seriesTitle);
      const row = rowsBySlug.get("series");
      if (row) {
        const didWrite = upsertEntry(txs, {
          rowId: row.id,
          weekId: week.id,
          content: jsonSeries(
            seriesId,
            seriesTitle,
            extractWeekNumber(sanDimasPlan?.weekLabel ?? null),
          ),
          existing: entriesByRowId.get(row.id),
        });
        (didWrite ? written : skipped).push("series");
      }
    }

    const sermonTitle =
      sanDimasPlan?.sermonTitle ??
      planningCenter.ranchoCucamonga?.sermonTitle ??
      planningCenter.westCovina?.sermonTitle ??
      null;

    const sermonTitleRow = rowsBySlug.get("sermon-title");
    if (sermonTitleRow && sermonTitle) {
      const didWrite = upsertEntry(txs, {
        rowId: sermonTitleRow.id,
        weekId: week.id,
        content: jsonText(sermonTitle),
        existing: entriesByRowId.get(sermonTitleRow.id),
      });
      (didWrite ? written : skipped).push("sermon-title");
    }

    if (txs.length > 0) {
      await adminDb.transact(txs);
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      written,
      skipped,
      planningCenter: {
        sourceOfTruth: sanDimasPlan?.campusName ?? null,
        seriesTitle,
        sermonTitle,
        songs,
        hostsByCampus: campusPlans.map((plan) => ({
          campusName: plan?.campusName ?? null,
          hosts: plan?.hosts ?? [],
        })),
        worshipLeadersByCampus: campusPlans.map((plan) => ({
          campusName: plan?.campusName ?? null,
          worshipLeaders: plan?.worshipLeaders ?? [],
        })),
        serviceTimesByCampus: campusPlans.map((plan) => ({
          campusName: plan?.campusName ?? null,
          serviceTimes: plan?.serviceTimes ?? [],
        })),
        notes: [
          "Sermon title is only filled when Planning Center exposes a non-generic plan title.",
          "Songs use San Dimas as the canonical source for the weekend.",
          "Hosts and worship leaders are written per-campus to dedicated sub-rows.",
        ],
      },
    });
  } catch (error) {
    console.error("Planning Center prefill error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Planning Center prefill failed",
      },
      { status: 500 },
    );
  }
}
