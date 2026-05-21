import Link from "next/link";
import {
  searchPlanningCenterPlans,
  type PlanningCenterPlanSearchResult,
} from "@/lib/planning-center";

export const dynamic = "force-dynamic";

const WEEK_COUNT = 16;
const PAST_WEEK_COUNT = 4;

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

type SearchState =
  | { result: PlanningCenterPlanSearchResult; error: null }
  | { result: null; error: string };

export default async function PlanningCenterPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const weeks = getRollingWeekendWeeks();
  const currentWeek = weeks.find((week) => week.isCurrent) ?? weeks[PAST_WEEK_COUNT];
  let searchState: SearchState | null = null;

  if (query) {
    try {
      searchState = {
        result: await searchPlanningCenterPlans(query),
        error: null,
      };
    } catch (error) {
      searchState = {
        result: null,
        error:
          error instanceof Error
            ? error.message
            : "Planning Center search failed",
      };
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-oa-black-900">
      <div className="border-b border-oa-stone-200/70 bg-[#fffaf0]/95 px-6 py-6 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oa-stone-300">
              <Link href="/calendar" className="hover:text-oa-black-700">
                Calendar
              </Link>
              <span>/</span>
              <span>Planning Center</span>
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              Planning Center Wrapper
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-oa-black-700">
              Read-only access to weekend service-plan data. This is the wrapper
              entry point for service order, songs, hosts, worship leaders,
              plan times, and team assignments pulled from Planning Center.
            </p>
          </div>
          {currentWeek ? (
            <Link
              href={`/planning-center/week/${currentWeek.weekStart}`}
              className="rounded-[--radius-button] bg-oa-black-900 px-5 py-3 text-sm font-bold text-oa-white hover:bg-oa-black-700"
            >
              Open Current Weekend
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-7">
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            label="Source contract"
            title="Read-only upstream data"
            detail="OAWeekend does not edit Planning Center plans from this interface."
          />
          <InfoCard
            label="Campus shape"
            title="Campus-specific service plans"
            detail="Hosts and worship leaders remain separated by campus."
          />
          <InfoCard
            label="Calendar link"
            title="Sync writes source rows"
            detail="Calendar prefill overwrites Rock/PCO-managed rows only."
          />
        </section>

        <section className="mb-6 rounded-[--radius-card] border border-oa-stone-200 bg-oa-white shadow-[--shadow-card]">
          <div className="border-b border-oa-stone-200/60 px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-oa-stone-300">
              Service plan search
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Find a Planning Center plan
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-oa-black-700">
              Search by weekend date, numeric plan ID, or Planning Center plan
              URL. Results stay read-only and link into the wrapper.
            </p>
          </div>
          <div className="px-5 py-5">
            <form
              action="/planning-center"
              className="flex flex-col gap-3 md:flex-row"
            >
              <label className="sr-only" htmlFor="planning-center-search">
                Planning Center search
              </label>
              <input
                id="planning-center-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="2026-05-23, 5/23/2026, 87349503, or a Planning Center plan URL"
                className="min-h-12 flex-1 rounded-[--radius-button] border border-oa-stone-200 bg-[#fffdf8] px-4 text-sm font-semibold outline-none transition-colors duration-[220ms] placeholder:text-oa-stone-300 focus:border-oa-black-900"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-[--radius-button] bg-oa-black-900 px-5 py-3 text-sm font-bold text-oa-white hover:bg-oa-black-700"
                >
                  Search
                </button>
                {query ? (
                  <Link
                    href="/planning-center"
                    className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-5 py-3 text-sm font-bold text-oa-black-700 hover:bg-oa-sand-100"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
            {searchState ? <SearchResults state={searchState} /> : null}
          </div>
        </section>

        <section className="rounded-[--radius-card] border border-oa-stone-200 bg-oa-white shadow-[--shadow-card]">
          <div className="border-b border-oa-stone-200/60 px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-oa-stone-300">
              Service plan weeks
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Rolling weekend window
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-oa-black-700">
              Open a weekend to inspect the source plan by campus. The detailed
              page pulls live Planning Center and Rock data on demand.
            </p>
          </div>
          <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
            {weeks.map((week) => (
              <Link
                key={week.weekStart}
                href={`/planning-center/week/${week.weekStart}`}
                className="group border-b border-oa-stone-200/60 px-5 py-4 transition-colors duration-[220ms] hover:bg-oa-sand-100/35 md:border-r xl:[&:nth-child(4n)]:border-r-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black tracking-tight">
                    {week.label}
                  </span>
                  {week.isCurrent ? (
                    <span className="rounded-full bg-oa-yellow-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-oa-yellow-600">
                      Current
                    </span>
                  ) : week.isPast ? (
                    <span className="rounded-full bg-oa-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-oa-stone-300">
                      Past
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#00A4C7]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#007996]">
                      Future
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs font-semibold text-oa-stone-300">
                  {week.weekStart}
                </div>
                <div className="mt-3 text-sm font-bold text-oa-black-700 group-hover:text-oa-black-900">
                  Open service wrapper →
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SearchResults({ state }: { state: SearchState }) {
  if (!state.result) {
    return (
      <div className="mt-4 rounded-[16px] border border-[#f0b4ab] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#9f1f13]">
        {state.error}
      </div>
    );
  }

  const result = state.result;

  if (result.kind === "week" && result.weekStart) {
    return (
      <div className="mt-4 rounded-[16px] border border-[#00A4C7]/25 bg-[#eefaff] px-4 py-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#007996]">
          Weekend match
        </div>
        <div className="mt-1 text-lg font-black tracking-tight">
          {formatWeekDate(result.weekStart)}
        </div>
        <div className="mt-1 text-sm text-oa-black-700">
          Normalized from <span className="font-semibold">{result.input}</span>.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/planning-center/week/${result.weekStart}`}
            className="rounded-[--radius-button] bg-oa-black-900 px-4 py-2 text-sm font-semibold text-oa-white hover:bg-oa-black-700"
          >
            Open wrapper
          </Link>
          <Link
            href={`/calendar/week/${result.weekStart}`}
            className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
          >
            Open calendar week
          </Link>
        </div>
      </div>
    );
  }

  if (result.kind === "planId") {
    return (
      <div className="mt-4 space-y-3">
        {result.matches.length > 0 ? (
          result.matches.map((match) => (
            <div
              key={`${match.campusName}-${match.planId}`}
              className="rounded-[16px] border border-oa-stone-200 bg-[#fffdf8] px-4 py-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
                    {match.campusName}
                  </div>
                  <div className="mt-1 text-lg font-black tracking-tight">
                    PCO plan {match.planId}
                  </div>
                  <div className="mt-1 text-sm text-oa-black-700">
                    {[match.seriesTitle, match.planTitle]
                      .filter(Boolean)
                      .join(" - ") || "No series or title"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-oa-stone-300">
                    {[match.dates, match.sortDate].filter(Boolean).join(" / ") ||
                      "No date metadata"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {match.weekStart ? (
                    <Link
                      href={`/planning-center/week/${match.weekStart}?campus=${slugifyCampus(match.campusName)}`}
                      className="rounded-[--radius-button] bg-oa-black-900 px-4 py-2 text-sm font-semibold text-oa-white hover:bg-oa-black-700"
                    >
                      Open wrapper
                    </Link>
                  ) : null}
                  <a
                    href={match.planUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
                  >
                    Open in Planning Center
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[16px] border border-oa-stone-200 bg-[#fffdf8] px-4 py-4 text-sm text-oa-black-700">
            No configured campus service type matched plan ID{" "}
            <span className="font-semibold">{result.planId}</span>. Search
            checks San Dimas, Rancho Cucamonga, and West Covina.
          </div>
        )}
        {result.campusErrors.length > 0 ? (
          <div className="rounded-[16px] border border-[#f0b4ab] bg-[#fff1ef] px-4 py-3 text-xs font-semibold text-[#9f1f13]">
            {result.campusErrors.length} campus lookup
            {result.campusErrors.length === 1 ? "" : "s"} failed during search.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[16px] border border-oa-stone-200 bg-[#fffdf8] px-4 py-3 text-sm text-oa-black-700">
      Search accepts <span className="font-semibold">YYYY-MM-DD</span>,{" "}
      <span className="font-semibold">M/D/YYYY</span>, a numeric Planning
      Center plan ID, or a Planning Center plan URL.
    </div>
  );
}

function InfoCard({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[--radius-card] border border-oa-stone-200 bg-oa-white px-5 py-4 shadow-[--shadow-card]">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
        {label}
      </div>
      <div className="mt-2 text-lg font-black tracking-tight">{title}</div>
      <div className="mt-1 text-sm leading-6 text-oa-black-700">{detail}</div>
    </div>
  );
}

function getRollingWeekendWeeks() {
  const todayKey = getPacificTodayKey();
  const today = new Date(`${todayKey}T00:00:00`);
  const currentSaturday = new Date(today);
  const diffToSaturday = (6 - currentSaturday.getDay() + 7) % 7;
  currentSaturday.setDate(currentSaturday.getDate() + diffToSaturday);

  const start = new Date(currentSaturday);
  start.setDate(currentSaturday.getDate() - PAST_WEEK_COUNT * 7);

  return Array.from({ length: WEEK_COUNT }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index * 7);
    const weekStart = toDateKey(date);
    return {
      weekStart,
      label: formatWeekDate(weekStart),
      isCurrent: weekStart === toDateKey(currentSaturday),
      isPast: date < currentSaturday,
    };
  });
}

function getPacificTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatWeekDate(weekStart: string) {
  const sat = new Date(`${weekStart}T00:00:00`);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return `${sat.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} & ${sun.getDate()}`;
}

function slugifyCampus(campusName: string) {
  return campusName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
