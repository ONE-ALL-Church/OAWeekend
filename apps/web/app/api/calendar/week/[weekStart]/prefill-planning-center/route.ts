import { NextResponse } from "next/server";
import { id } from "@instantdb/admin";
import adminDb from "@/lib/instant-admin";
import {
  extractWeekNumber,
  getWeekendPlansForWeek,
  type PlanningCenterPerson,
} from "@/lib/planning-center";
import { getSermonForWeek, type RockSeriesDetails } from "@/lib/rock";
import {
  CALENDAR_DEFAULT_ROWS,
  CALENDAR_DEFAULT_SECTIONS,
  isCalendarSystemRowSlug,
} from "@oaweekend/shared";

type AdminTxBatch = Extract<Parameters<typeof adminDb.transact>[0], unknown[]>;

function jsonText(value: string) {
  return JSON.stringify({ value });
}

function jsonEmptySeries() {
  return JSON.stringify({
    seriesId: null,
    weekNumber: 0,
    label: "",
    narrative: null,
    objectives: [],
    imageUrl: null,
    startDate: null,
  });
}

function jsonPeople(people: PlanningCenterPerson[]) {
  return JSON.stringify({
    people: people.map((p) => ({
      name: p.name,
      initials: buildInitials(p.name),
      rockPersonId: null,
      pcoPersonId: p.pcoPersonId ?? null,
      photoUrl: p.photoUrl ?? null,
    })),
  });
}

function jsonSeries(
  seriesId: string,
  seriesName: string,
  weekNumber: number | null,
  details?: RockSeriesDetails | null,
) {
  return JSON.stringify({
    seriesId,
    weekNumber: weekNumber ?? 0,
    label: seriesName,
    narrative: details?.narrative ?? null,
    objectives: details?.objectives ?? [],
    imageUrl: details?.imageUrl ?? null,
    startDate: details?.startDate ?? null,
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

async function ensureCalendarStructure() {
  const data = await adminDb.query({
    calendarSections: {
      rows: {},
    },
  });

  const sectionsBySlug = new Map(
    (data.calendarSections ?? []).map((section) => [section.slug, section]),
  );
  const txs: AdminTxBatch = [];
  const now = Date.now();

  for (const sectionDef of CALENDAR_DEFAULT_SECTIONS) {
    let section = sectionsBySlug.get(sectionDef.slug);
    if (!section) {
      const sectionId = id();
      section = {
        id: sectionId,
        name: sectionDef.name,
        slug: sectionDef.slug,
        sortOrder: sectionDef.sortOrder,
        color: sectionDef.color,
        createdAt: now,
        updatedAt: now,
        rows: [],
      };
      sectionsBySlug.set(sectionDef.slug, section);
      txs.push(
        adminDb.tx.calendarSections[sectionId].update({
          name: sectionDef.name,
          slug: sectionDef.slug,
          color: sectionDef.color,
          sortOrder: sectionDef.sortOrder,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    const rowDefs = CALENDAR_DEFAULT_ROWS[sectionDef.slug] ?? [];
    const existingRowsBySlug = new Map(
      (section.rows ?? []).map((row) => [row.slug, row]),
    );
    const rowIdsBySlug = new Map<string, string>();

    for (const rowDef of rowDefs) {
      rowIdsBySlug.set(rowDef.slug, existingRowsBySlug.get(rowDef.slug)?.id ?? id());
    }

    for (const rowDef of rowDefs) {
      const rowId = rowIdsBySlug.get(rowDef.slug)!;
      const existingRow = existingRowsBySlug.get(rowDef.slug);
      const parentRowId = rowDef.parentSlug
        ? rowIdsBySlug.get(rowDef.parentSlug) ?? ""
        : "";
      const rowUpdate = {
        name: rowDef.name,
        slug: rowDef.slug,
        fieldType: rowDef.fieldType,
        sortOrder: rowDef.sortOrder,
        campusSpecific: rowDef.campusSpecific,
        campusId: rowDef.campusId ?? "",
        parentRowId,
        createdAt: existingRow?.createdAt ?? now,
      };

      if (!existingRow || isCalendarSystemRowSlug(rowDef.slug)) {
        txs.push(adminDb.tx.calendarRows[rowId].update(rowUpdate));
      }

      if (!existingRow) {
        txs.push(adminDb.tx.calendarRows[rowId].link({ section: section.id }));
      }
    }
  }

  if (txs.length > 0) {
    await adminDb.transact(txs);
  }
}

function upsertEntry(
  txs: AdminTxBatch,
  opts: {
    rowId: string;
    weekId: string;
    content: string;
    source?: string;
    existing: { id: string; content: string } | undefined;
  },
) {
  const source = opts.source ?? "planning-center";

  if (opts.existing) {
    txs.push(
      adminDb.tx.calendarEntries[opts.existing.id].update({
        content: opts.content,
        status: "confirmed",
        source,
        updatedAt: Date.now(),
        updatedBy: source === "rock" ? "rock-prefill" : "planning-center-prefill",
      }),
    );
  } else {
    const entryId = id();
    txs.push(
      adminDb.tx.calendarEntries[entryId].update({
        content: opts.content,
        status: "confirmed",
        source,
        updatedAt: Date.now(),
        updatedBy: source === "rock" ? "rock-prefill" : "planning-center-prefill",
      }),
      adminDb.tx.calendarEntries[entryId].link({ week: opts.weekId }),
      adminDb.tx.calendarEntries[entryId].link({ row: opts.rowId }),
    );
  }
}

function unlinkOtherSeriesForWeek(
  txs: AdminTxBatch,
  linkedSeries: Array<{ id: string }> | undefined,
  weekId: string,
  keepSeriesId: string | null,
) {
  for (const series of linkedSeries ?? []) {
    if (series.id !== keepSeriesId) {
      txs.push(adminDb.tx.calendarSeries[series.id].unlink({ weeks: weekId }));
    }
  }
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
    const txs: AdminTxBatch = [];
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

    await ensureCalendarStructure();

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

    const txs: AdminTxBatch = [];
    const written: string[] = [];

    const sanDimasPlan = planningCenter.sanDimas;
    const campusPlanSources = [
      {
        campusName: "San Dimas",
        hostSlug: "host-san-dimas",
        worshipLeaderSlug: "worship-leader-san-dimas",
        plan: planningCenter.sanDimas,
      },
      {
        campusName: "Rancho Cucamonga",
        hostSlug: "host-rancho",
        worshipLeaderSlug: "worship-leader-rancho",
        plan: planningCenter.ranchoCucamonga,
      },
      {
        campusName: "West Covina",
        hostSlug: "host-west-covina",
        worshipLeaderSlug: "worship-leader-west-covina",
        plan: planningCenter.westCovina,
      },
    ];

    const songs = sanDimasPlan?.songs ?? [];
    for (let index = 0; index < 4; index++) {
      const song = songs[index];
      const slug = `song-${index + 1}`;
      const row = rowsBySlug.get(slug);
      if (!row) continue;
      const content = song
        ? JSON.stringify({
            value: song.title,
            songKey: song.key ?? null,
            songAuthor: song.author ?? null,
            songCcli: song.ccliNumber ?? null,
            songThemes: song.themes ?? null,
            songLastScheduled: song.lastScheduled ?? null,
            songDescription: song.description ?? null,
            songLengthSeconds: song.lengthSeconds ?? null,
            songLeader: song.songLeader ?? null,
          })
        : jsonText("");
      upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content,
        existing: entriesByRowId.get(row.id),
      });
      written.push(slug);
    }

    // Host — write per-campus sub-rows. Missing PCO data clears stale values.
    for (const { hostSlug: slug, plan } of campusPlanSources) {
      const row = rowsBySlug.get(slug);
      if (!row) continue;

      upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonPeople(plan?.hosts ?? []),
        existing: entriesByRowId.get(row.id),
      });
      written.push(slug);
    }

    // Worship Leader — write per-campus sub-rows. Missing PCO data clears stale values.
    for (const { worshipLeaderSlug: slug, plan } of campusPlanSources) {
      const row = rowsBySlug.get(slug);
      if (!row) continue;

      upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonPeople(plan?.worshipLeaders ?? []),
        existing: entriesByRowId.get(row.id),
      });
      written.push(slug);
    }

    // --- Rock RMS: Series, Sermon Title, Speaker ---
    let rockSermon: Awaited<ReturnType<typeof getSermonForWeek>> = null;
    let rockError: string | null = null;

    try {
      rockSermon = await getSermonForWeek(weekStart);
    } catch (error) {
      rockError =
        error instanceof Error ? error.message : "Rock sermon lookup failed";
      console.warn("Rock sermon lookup failed:", error);
    }

    const pcoSeriesTitle =
      sanDimasPlan?.seriesTitle ??
      planningCenter.ranchoCucamonga?.seriesTitle ??
      planningCenter.westCovina?.seriesTitle ??
      null;
    const pcoSermonTitle =
      sanDimasPlan?.sermonTitle ??
      planningCenter.ranchoCucamonga?.sermonTitle ??
      planningCenter.westCovina?.sermonTitle ??
      null;
    const sourceSeriesTitle = rockSermon?.seriesTitle ?? pcoSeriesTitle;
    const seriesSource = rockSermon?.seriesTitle ? "rock" : "planning-center";
    const linkedSeries = (week.series ?? []) as Array<{ id: string }>;

    // Series (Rock first, then Planning Center fallback). Clear stale series when absent.
    const seriesRow = rowsBySlug.get("series");
    if (seriesRow) {
      const keepSeriesId = sourceSeriesTitle
        ? await ensureSeriesForWeek(week.id, weekStart, sourceSeriesTitle)
        : null;

      unlinkOtherSeriesForWeek(txs, linkedSeries, week.id, keepSeriesId);

      upsertEntry(txs, {
        rowId: seriesRow.id,
        weekId: week.id,
        content: sourceSeriesTitle
          ? jsonSeries(
              keepSeriesId!,
              sourceSeriesTitle,
              extractWeekNumber(sanDimasPlan?.weekLabel ?? null),
              rockSermon?.seriesTitle ? rockSermon.seriesDetails : null,
            )
          : jsonEmptySeries(),
        source: seriesSource,
        existing: entriesByRowId.get(seriesRow.id),
      });
      written.push("series");
    }

    // Sermon Title (Rock first, then Planning Center fallback). Clear stale title when absent.
    const sermonTitleRow = rowsBySlug.get("sermon-title");
    if (sermonTitleRow) {
      const sermonTitle = rockSermon?.sermonTitle ?? pcoSermonTitle ?? "";
      upsertEntry(txs, {
        rowId: sermonTitleRow.id,
        weekId: week.id,
        content: jsonText(sermonTitle),
        source: rockSermon?.sermonTitle ? "rock" : "planning-center",
        existing: entriesByRowId.get(sermonTitleRow.id),
      });
      written.push("sermon-title");
    }

    // Speaker comes from Rock only. Clear stale speaker when Rock has no value.
    const speakerRow = rowsBySlug.get("speaker");
    if (speakerRow) {
      upsertEntry(txs, {
        rowId: speakerRow.id,
        weekId: week.id,
        content: jsonPeople(
          rockSermon?.speaker
            ? [{ name: rockSermon.speaker, photoUrl: null, pcoPersonId: null }]
            : [],
        ),
        source: "rock",
        existing: entriesByRowId.get(speakerRow.id),
      });
      written.push("speaker");
    }

    if (txs.length > 0) {
      await adminDb.transact(txs);
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      written,
      skipped: [],
      rock: rockSermon ? {
        seriesTitle: rockSermon.seriesTitle,
        sermonTitle: rockSermon.sermonTitle,
        speaker: rockSermon.speaker,
      } : null,
      rockError,
      planningCenter: {
        sourceOfTruth: sanDimasPlan?.campusName ?? null,
        seriesTitle: pcoSeriesTitle,
        sermonTitle: pcoSermonTitle,
        songs,
        hostsByCampus: campusPlanSources.map(({ campusName, plan }) => ({
          campusName,
          hosts: plan?.hosts ?? [],
        })),
        worshipLeadersByCampus: campusPlanSources.map(({ campusName, plan }) => ({
          campusName,
          worshipLeaders: plan?.worshipLeaders ?? [],
        })),
        serviceTimesByCampus: campusPlanSources.map(({ campusName, plan }) => ({
          campusName,
          serviceTimes: plan?.serviceTimes ?? [],
        })),
        notes: [
          "Synced calendar rows are source-of-truth fields and are overwritten on each sync.",
          "Sermon title uses Rock first, then Planning Center when Rock has no value.",
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
