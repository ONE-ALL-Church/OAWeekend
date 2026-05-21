import Link from "next/link";
import {
  getWeekendPlansForWeek,
  type PlanningCenterPerson,
  type PlanningCenterPlanTimeSummary,
  type PlanningCenterServiceItem,
  type PlanningCenterTeamAssignment,
  type WeekendPlanSummary,
} from "@/lib/planning-center";
import { getSermonForWeek } from "@/lib/rock";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ weekStart: string }>;
}

export default async function PlanningCenterWeekPage({ params }: PageProps) {
  const { weekStart } = await params;
  const [planningCenterResult, rockResult] = await Promise.allSettled([
    getWeekendPlansForWeek(weekStart),
    getSermonForWeek(weekStart),
  ]);

  const planningCenter =
    planningCenterResult.status === "fulfilled"
      ? planningCenterResult.value
      : null;
  const rockSermon =
    rockResult.status === "fulfilled" ? rockResult.value : null;
  const error =
    planningCenterResult.status === "rejected"
      ? planningCenterResult.reason instanceof Error
        ? planningCenterResult.reason.message
        : "Planning Center lookup failed"
      : null;

  const campusPlans = planningCenter?.plans ?? [];

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-oa-black-900">
      <div className="border-b border-oa-stone-200/70 bg-[#fffaf0]/95 px-6 py-5 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oa-stone-300">
              <Link href="/calendar" className="hover:text-oa-black-700">
                Calendar
              </Link>
              <span>/</span>
              <Link
                href={`/calendar/week/${weekStart}`}
                className="hover:text-oa-black-700"
              >
                {formatWeekDate(weekStart)}
              </Link>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Planning Center Source Data
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-oa-black-700">
              Read-only weekend plan data pulled from Planning Center Services.
              Songs use San Dimas as the calendar source of truth; hosts and
              worship leaders stay campus-specific.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/calendar/week/${weekStart}`}
              className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
            >
              Back to Week
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {error ? (
          <div className="rounded-[--radius-card] border border-[#f0b4ab] bg-[#fff1ef] px-5 py-4 text-sm text-[#9f1f13]">
            {error}
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Rock sermon"
            title={rockSermon?.sermonTitle ?? "No Rock sermon found"}
            detail={rockSermon?.seriesTitle ?? "Series not available"}
          />
          <SummaryCard
            label="Planning Center campuses"
            title={`${campusPlans.filter((entry) => entry.plan).length} of ${campusPlans.length || 3} found`}
            detail="San Dimas, Rancho Cucamonga, West Covina"
          />
          <SummaryCard
            label="Calendar behavior"
            title="Read-only source rows"
            detail="Sync overwrites PCO/Rock-managed fields"
          />
        </section>

        <section className="space-y-5">
          {campusPlans.map(({ campusName, plan }) => (
            <CampusPlanCard
              key={campusName}
              campusName={campusName}
              plan={plan}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
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
      <div className="mt-1 text-sm text-oa-black-700">{detail}</div>
    </div>
  );
}

function CampusPlanCard({
  campusName,
  plan,
}: {
  campusName: string;
  plan: WeekendPlanSummary | null;
}) {
  if (!plan) {
    return (
      <article className="rounded-[--radius-card] border border-oa-stone-200 bg-oa-white px-5 py-5 shadow-[--shadow-card]">
        <h2 className="text-xl font-black tracking-tight">{campusName}</h2>
        <p className="mt-2 text-sm text-oa-stone-300">
          No Planning Center plan was found for this weekend.
        </p>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-[--radius-card] border border-oa-stone-200 bg-oa-white shadow-[--shadow-card]">
      <div className="border-b border-oa-stone-200/60 bg-[#fffaf0] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight">
                {campusName}
              </h2>
              <span className="rounded-full bg-[#00A4C7]/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#007996]">
                PCO plan {plan.planId}
              </span>
            </div>
            <p className="mt-2 text-sm text-oa-black-700">
              {plan.seriesTitle ?? "No series title"}{" "}
              {plan.sermonTitle ? `- ${plan.sermonTitle}` : ""}
            </p>
          </div>
          <a
            href={plan.planUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-[--radius-button] bg-oa-black-900 px-4 py-2 text-sm font-semibold text-oa-white hover:bg-oa-black-700"
          >
            Open in Planning Center
          </a>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="Dates" value={plan.dates ?? "Not set"} />
          <Metric
            label="Length"
            value={formatDuration(plan.totalLengthSeconds)}
          />
          <Metric
            label="Service times"
            value={plan.serviceTimes.join(", ") || "Not set"}
          />
          <Metric
            label="All plan times"
            value={`${plan.planTimes.length} time${plan.planTimes.length === 1 ? "" : "s"}`}
          />
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-oa-stone-200/60 px-5 py-5 lg:border-b-0 lg:border-r">
          <PeopleBlock title="Hosts" people={plan.hosts} />
          <div className="mt-5">
            <PeopleBlock
              title="Worship Leaders"
              people={plan.worshipLeaders}
            />
          </div>
          <div className="mt-5">
            <PlanTimesBlock times={plan.planTimes} />
          </div>
          <div className="mt-5">
            <TeamAssignmentsBlock assignments={plan.teamMembers} />
          </div>
          <div className="mt-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
              Songs
            </div>
            <div className="mt-2 space-y-2">
              {plan.songs.length > 0 ? (
                plan.songs.map((song) => (
                  <a
                    key={`${song.title}-${song.sourceUrl ?? ""}`}
                    href={song.sourceUrl ?? plan.planUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[14px] border border-oa-stone-200 bg-oa-sand-100/20 px-3 py-2 hover:bg-oa-sand-100/45"
                  >
                    <div className="text-sm font-bold">{song.title}</div>
                    <div className="mt-0.5 text-xs text-oa-black-700">
                      {[song.key, song.songLeader].filter(Boolean).join(" / ") ||
                        "No key or leader"}
                    </div>
                  </a>
                ))
              ) : (
                <p className="text-sm text-oa-stone-300">No songs found.</p>
              )}
            </div>
          </div>
        </aside>

        <div className="px-5 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black tracking-tight">Service Order</h3>
            <span className="text-xs font-semibold text-oa-stone-300">
              {plan.serviceItems.length} items
            </span>
          </div>
          <div className="space-y-2">
            {plan.serviceItems.map((item) => (
              <ServiceItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-oa-stone-200 bg-oa-white px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-oa-stone-300">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-oa-black-900">
        {value}
      </div>
    </div>
  );
}

function PeopleBlock({
  title,
  people,
}: {
  title: string;
  people: PlanningCenterPerson[];
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {people.length > 0 ? (
          people.map((person) => (
            <span
              key={`${title}-${person.name}`}
              className="rounded-full border border-oa-stone-200 bg-oa-white px-3 py-1.5 text-sm font-semibold"
            >
              {person.name}
            </span>
          ))
        ) : (
          <span className="text-sm text-oa-stone-300">Not assigned</span>
        )}
      </div>
    </div>
  );
}

function PlanTimesBlock({ times }: { times: PlanningCenterPlanTimeSummary[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
        Plan Times
      </div>
      <div className="mt-2 space-y-1.5">
        {times.length > 0 ? (
          times.map((time, index) => (
            <div
              key={`${time.name ?? "time"}-${time.startsAt ?? index}`}
              className="rounded-[12px] border border-oa-stone-200 bg-oa-white px-3 py-2 text-xs"
            >
              <div className="font-bold text-oa-black-900">
                {time.name ?? time.timeType ?? "Plan time"}
              </div>
              <div className="mt-0.5 text-oa-black-700">
                {[time.displayTime, time.timeType].filter(Boolean).join(" / ") ||
                  "No time set"}
              </div>
            </div>
          ))
        ) : (
          <span className="text-sm text-oa-stone-300">No times found</span>
        )}
      </div>
    </div>
  );
}

function TeamAssignmentsBlock({
  assignments,
}: {
  assignments: PlanningCenterTeamAssignment[];
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
        Team Assignments
      </div>
      <div className="mt-2 space-y-1.5">
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <div
              key={`${assignment.role ?? "role"}-${assignment.name}`}
              className="rounded-[12px] border border-oa-stone-200 bg-oa-white px-3 py-2 text-xs"
            >
              <div className="font-bold text-oa-black-900">
                {assignment.name}
              </div>
              <div className="mt-0.5 text-oa-black-700">
                {assignment.role ?? "Unassigned role"}
              </div>
            </div>
          ))
        ) : (
          <span className="text-sm text-oa-stone-300">
            No active team assignments
          </span>
        )}
      </div>
    </div>
  );
}

function ServiceItemRow({ item }: { item: PlanningCenterServiceItem }) {
  return (
    <a
      href={item.sourceUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="grid gap-3 rounded-[16px] border border-oa-stone-200 bg-[#fffdf8] px-4 py-3 hover:bg-oa-sand-100/35 md:grid-cols-[56px_1fr_auto]"
    >
      <div className="text-xs font-black text-oa-stone-300">
        {item.sequence != null ? String(item.sequence).padStart(2, "0") : "--"}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black">{item.title || "Untitled"}</span>
          {item.itemType ? (
            <span className="rounded-full bg-oa-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-oa-black-700">
              {item.itemType}
            </span>
          ) : null}
          {item.keyName ? (
            <span className="rounded-full bg-oa-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-oa-yellow-600">
              Key {item.keyName}
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-1 text-sm leading-6 text-oa-black-700">
            {item.description}
          </p>
        ) : null}
        {item.song?.songLeader ? (
          <p className="mt-1 text-xs font-semibold text-oa-black-700">
            By {item.song.songLeader}
          </p>
        ) : null}
        {item.notes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.notes.map((note, index) => (
              <span
                key={`${item.id}-note-${index}`}
                className="rounded-full bg-[#00A4C7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#007996]"
              >
                {note.categoryName ? `${note.categoryName}: ` : ""}
                {note.content}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-xs font-semibold text-oa-stone-300">
        {formatDuration(item.lengthSeconds)}
      </div>
    </a>
  );
}

function formatWeekDate(weekStart: string) {
  const sat = new Date(`${weekStart}T00:00:00`);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return `${sat.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })} & ${sun.getDate()}, ${sat.getFullYear()}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "Not set";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}
