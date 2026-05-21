import type { CalendarSourceSnapshot } from "@/lib/calendar-source-snapshot";
import type { WeekendPlanSummary } from "@/lib/planning-center";
import type { RockSermonForWeek } from "@/lib/rock";

interface PlanningCenterWeekPlans {
  sanDimas: WeekendPlanSummary | null;
  ranchoCucamonga: WeekendPlanSummary | null;
  westCovina: WeekendPlanSummary | null;
  plans: Array<{
    campusName: string;
    serviceTypeId: number;
    plan: WeekendPlanSummary | null;
  }>;
}

interface ExpectedSourceRow {
  slug: string;
  label: string;
  sourceLabel: string;
  expectedValue: string;
}

type ComparisonStatus = "matched" | "missing" | "review";

export function SourceComparisonPanel({
  rockSermon,
  rockError,
  planningCenter,
  planningCenterError,
  calendarSnapshot,
  calendarError,
}: {
  rockSermon: RockSermonForWeek | null;
  rockError: string | null;
  planningCenter: PlanningCenterWeekPlans | null;
  planningCenterError: string | null;
  calendarSnapshot: CalendarSourceSnapshot | null;
  calendarError: string | null;
}) {
  const expectedRows = buildExpectedRows(rockSermon, planningCenter);
  const storedRowsBySlug = new Map(
    (calendarSnapshot?.rows ?? []).map((row) => [row.slug, row]),
  );
  const comparisons = expectedRows.map((row) => {
    const storedRow = storedRowsBySlug.get(row.slug) ?? null;
    return {
      ...row,
      storedRow,
      status: getComparisonStatus(row.expectedValue, storedRow?.displayValue),
    };
  });
  const matchedCount = comparisons.filter((row) => row.status === "matched")
    .length;
  const missingCount = comparisons.filter((row) => row.status === "missing")
    .length;
  const reviewCount = comparisons.filter((row) => row.status === "review")
    .length;
  const issueRows = comparisons.filter((row) => row.status !== "matched");
  const visibleComparisons = issueRows.length > 0 ? issueRows : comparisons;
  const hasSourceError = Boolean(rockError || planningCenterError || calendarError);
  const shouldOpen = issueRows.length > 0 || hasSourceError;

  const pcoSeriesTitle = pickFirstPlanningCenterValue(
    planningCenter,
    "seriesTitle",
  );
  const pcoSermonTitle = pickFirstPlanningCenterValue(
    planningCenter,
    "sermonTitle",
  );
  const sanDimasSongs = planningCenter?.sanDimas?.songs ?? [];
  const campusPlans = planningCenter?.plans ?? [];

  return (
    <section className="mt-6">
      <details
        className="group overflow-hidden rounded-[--radius-card] border border-oa-stone-200 bg-oa-white shadow-[--shadow-card]"
        open={shouldOpen}
      >
        <summary className="grid cursor-pointer list-none gap-4 bg-[#fffaf0] px-5 py-4 lg:grid-cols-[minmax(0,1fr)_320px] [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-oa-stone-300">
              Source health
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black tracking-tight">
                Rock, Planning Center, and calendar rows
              </h2>
              <span className="text-oa-black-700 transition-transform duration-[220ms] group-open:rotate-90">
                →
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-oa-black-700">
              {issueRows.length > 0 || hasSourceError
                ? "Review source exceptions before trusting the stored calendar rows."
                : "All managed source rows match. Expand for row-level audit detail."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatusMetric label="Matched" value={matchedCount} tone="matched" />
            <StatusMetric label="Review" value={reviewCount} tone="review" />
            <StatusMetric label="Missing" value={missingCount} tone="missing" />
          </div>
        </summary>

        <div className="grid gap-0 border-t border-oa-stone-200/60 lg:grid-cols-3">
          <SourceCard
            title="Rock RMS"
            tone="rock"
            error={rockError}
            rows={[
              ["Series", rockSermon?.seriesTitle ?? "Not found"],
              ["Sermon title", rockSermon?.sermonTitle ?? "Not found"],
              ["Speaker", rockSermon?.speaker ?? "Not assigned"],
            ]}
          />
          <SourceCard
            title="Planning Center"
            tone="planning-center"
            error={planningCenterError}
            rows={[
              ["Series", pcoSeriesTitle ?? "Not found"],
              ["Plan title", pcoSermonTitle ?? "Not found"],
              [
                "San Dimas songs",
                sanDimasSongs.length > 0
                  ? sanDimasSongs
                      .slice(0, 4)
                      .map((song) => song.title)
                      .join(", ")
                  : "Not found",
              ],
              [
                "Campus plans",
                campusPlans
                  .map(({ campusName, plan }) =>
                    plan
                      ? `${campusName}: ${plan.planId}`
                      : `${campusName}: none`,
                  )
                  .join(" / ") || "Not found",
              ],
            ]}
          />
          <SourceCard
            title="Stored calendar rows"
            tone="calendar"
            error={calendarError}
            rows={[
              [
                "Week row",
                calendarSnapshot?.weekFound
                  ? calendarSnapshot.weekId ?? "Found"
                  : "Not found",
              ],
              [
                "Last source sync",
                calendarSnapshot?.latestUpdatedAt
                  ? formatTimestamp(calendarSnapshot.latestUpdatedAt)
                  : "No source rows",
              ],
              [
                "Source counts",
                calendarSnapshot
                  ? `${calendarSnapshot.planningCenterCount} PCO / ${calendarSnapshot.rockCount} Rock`
                  : "Unavailable",
              ],
              [
                "Empty managed rows",
                calendarSnapshot
                  ? String(calendarSnapshot.missingSlugs.length)
                  : "Unavailable",
              ],
            ]}
          />
        </div>

        <div className="border-t border-oa-stone-200/60 px-5 py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black tracking-tight">
                Managed Row Diff
              </h3>
              <p className="mt-1 text-xs font-semibold text-oa-stone-300">
                {issueRows.length > 0
                  ? `${issueRows.length} source exception${issueRows.length === 1 ? "" : "s"} shown first`
                  : `${comparisons.length} managed source row${comparisons.length === 1 ? "" : "s"} matched`}
              </p>
            </div>
            <span className="text-xs font-semibold text-oa-stone-300">
              Expected source value vs current InstantDB row content
            </span>
          </div>
          <div className="overflow-hidden rounded-[16px] border border-oa-stone-200">
            {visibleComparisons.map((row) => (
              <ComparisonRow key={row.slug} row={row} />
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function SourceCard({
  title,
  tone,
  rows,
  error,
}: {
  title: string;
  tone: "rock" | "planning-center" | "calendar";
  rows: Array<[string, string]>;
  error: string | null;
}) {
  const toneClass =
    tone === "rock"
      ? "text-[#6873B3]"
      : tone === "planning-center"
        ? "text-[#007996]"
        : "text-oa-yellow-600";

  return (
    <div className="border-b border-oa-stone-200/60 px-5 py-5 lg:border-b-0 lg:border-r last:lg:border-r-0">
      <div className={`text-[11px] font-bold uppercase tracking-[0.16em] ${toneClass}`}>
        {title}
      </div>
      {error ? (
        <div className="mt-3 rounded-[12px] border border-[#f0b4ab] bg-[#fff1ef] px-3 py-2 text-xs font-semibold text-[#9f1f13]">
          {error}
        </div>
      ) : null}
      <dl className="mt-3 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-oa-stone-300">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-semibold leading-5 text-oa-black-900">
              {value || "Not assigned"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatusMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ComparisonStatus;
}) {
  return (
    <div className="rounded-[14px] border border-oa-stone-200 bg-oa-white px-3 py-2">
      <div className={`text-xl font-black ${statusTextClass(tone)}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-oa-stone-300">
        {label}
      </div>
    </div>
  );
}

function ComparisonRow({
  row,
}: {
  row: ExpectedSourceRow & {
    storedRow: CalendarSourceSnapshot["rows"][number] | null;
    status: ComparisonStatus;
  };
}) {
  return (
    <div className="grid gap-3 border-b border-oa-stone-200/60 bg-[#fffdf8] px-4 py-3 last:border-b-0 md:grid-cols-[170px_1fr_1fr_92px]">
      <div>
        <div className="text-sm font-black text-oa-black-900">{row.label}</div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-oa-stone-300">
          {row.sourceLabel}
        </div>
      </div>
      <ValueBlock label="Expected" value={row.expectedValue} />
      <ValueBlock
        label={`Stored${row.storedRow?.source ? ` / ${sourceLabel(row.storedRow.source)}` : ""}`}
        value={row.storedRow?.displayValue ?? "Missing row"}
        subvalue={
          row.storedRow?.updatedAt
            ? `Updated ${formatTimestamp(row.storedRow.updatedAt)}`
            : row.storedRow?.entryExists
              ? "No update timestamp"
              : "No stored entry"
        }
      />
      <div className="flex items-start md:justify-end">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(row.status)}`}
        >
          {row.status}
        </span>
      </div>
    </div>
  );
}

function ValueBlock({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-oa-stone-300">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-5 text-oa-black-900">
        {value || "Not assigned"}
      </div>
      {subvalue ? (
        <div className="mt-1 text-[11px] font-semibold text-oa-stone-300">
          {subvalue}
        </div>
      ) : null}
    </div>
  );
}

function buildExpectedRows(
  rockSermon: RockSermonForWeek | null,
  planningCenter: PlanningCenterWeekPlans | null,
): ExpectedSourceRow[] {
  const pcoSeriesTitle = pickFirstPlanningCenterValue(
    planningCenter,
    "seriesTitle",
  );
  const pcoSermonTitle = pickFirstPlanningCenterValue(
    planningCenter,
    "sermonTitle",
  );
  const sanDimasPlan = planningCenter?.sanDimas ?? null;
  const campusPlans = [
    {
      label: "San Dimas",
      hostSlug: "host-san-dimas",
      worshipSlug: "worship-leader-san-dimas",
      plan: planningCenter?.sanDimas ?? null,
    },
    {
      label: "Rancho Cucamonga",
      hostSlug: "host-rancho",
      worshipSlug: "worship-leader-rancho",
      plan: planningCenter?.ranchoCucamonga ?? null,
    },
    {
      label: "West Covina",
      hostSlug: "host-west-covina",
      worshipSlug: "worship-leader-west-covina",
      plan: planningCenter?.westCovina ?? null,
    },
  ];

  return [
    {
      slug: "series",
      label: "Series",
      sourceLabel: rockSermon?.seriesTitle
        ? "Rock source"
        : "Planning Center fallback",
      expectedValue: rockSermon?.seriesTitle ?? pcoSeriesTitle ?? "Not assigned",
    },
    {
      slug: "sermon-title",
      label: "Sermon Title",
      sourceLabel: rockSermon?.sermonTitle
        ? "Rock source"
        : "Planning Center fallback",
      expectedValue: rockSermon?.sermonTitle ?? pcoSermonTitle ?? "Not assigned",
    },
    {
      slug: "speaker",
      label: "Speaker",
      sourceLabel: "Rock source",
      expectedValue: rockSermon?.speaker ?? "Not assigned",
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      slug: `song-${index + 1}`,
      label: `Song ${index + 1}`,
      sourceLabel: "Planning Center / San Dimas",
      expectedValue: sanDimasPlan?.songs[index]?.title ?? "Not assigned",
    })),
    ...campusPlans.flatMap((campus) => [
      {
        slug: campus.hostSlug,
        label: `${campus.label} Host`,
        sourceLabel: "Planning Center campus row",
        expectedValue: formatPeople(campus.plan?.hosts ?? []),
      },
      {
        slug: campus.worshipSlug,
        label: `${campus.label} Worship Leader`,
        sourceLabel: "Planning Center campus row",
        expectedValue: formatPeople(campus.plan?.worshipLeaders ?? []),
      },
    ]),
  ];
}

function pickFirstPlanningCenterValue(
  planningCenter: PlanningCenterWeekPlans | null,
  key: "seriesTitle" | "sermonTitle",
) {
  return (
    planningCenter?.sanDimas?.[key] ??
    planningCenter?.ranchoCucamonga?.[key] ??
    planningCenter?.westCovina?.[key] ??
    null
  );
}

function formatPeople(people: Array<{ name: string }>) {
  return people.length > 0
    ? people.map((person) => person.name).join(", ")
    : "Not assigned";
}

function getComparisonStatus(
  expectedValue: string,
  storedValue: string | undefined,
): ComparisonStatus {
  if (!storedValue || isUnset(storedValue)) {
    return isUnset(expectedValue) ? "matched" : "missing";
  }
  if (isUnset(expectedValue)) {
    return isUnset(storedValue) ? "matched" : "review";
  }

  const expected = normalizeValue(expectedValue);
  const stored = normalizeValue(storedValue);
  return expected === stored ||
    stored.includes(expected) ||
    expected.includes(stored)
    ? "matched"
    : "review";
}

function normalizeValue(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isUnset(value: string) {
  const normalized = normalizeValue(value);
  return normalized === "" || normalized === "not assigned" || normalized === "none";
}

function sourceLabel(source: string) {
  if (source === "planning-center") return "PCO";
  if (source === "rock") return "Rock";
  return source;
}

function statusClass(status: ComparisonStatus) {
  if (status === "matched") {
    return "bg-[#eaf8f1] text-[#087443]";
  }
  if (status === "missing") {
    return "bg-[#fff1ef] text-[#b42318]";
  }
  return "bg-oa-yellow-500/15 text-oa-yellow-600";
}

function statusTextClass(status: ComparisonStatus) {
  if (status === "matched") return "text-[#087443]";
  if (status === "missing") return "text-[#b42318]";
  return "text-oa-yellow-600";
}

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
