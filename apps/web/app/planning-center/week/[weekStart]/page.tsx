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
  searchParams: Promise<{ campus?: string }>;
}

export default async function PlanningCenterWeekPage({
  params,
  searchParams,
}: PageProps) {
  const { weekStart } = await params;
  const { campus } = await searchParams;
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
  const activeCampus =
    campusPlans.find((entry) => slugifyCampus(entry.campusName) === campus) ??
    campusPlans.find((entry) => entry.plan) ??
    campusPlans[0] ??
    null;
  const prevWeek = shiftWeek(weekStart, -7);
  const nextWeek = shiftWeek(weekStart, 7);

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
                href="/planning-center"
                className="hover:text-oa-black-700"
              >
                Planning Center
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
              href="/planning-center"
              className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
            >
              All Weeks
            </Link>
            <Link
              href={`/calendar/week/${weekStart}`}
              className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
            >
              Back to Week
            </Link>
            <Link
              href={`/planning-center/week/${prevWeek}`}
              className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
            >
              ← Prev
            </Link>
            <Link
              href={`/planning-center/week/${nextWeek}`}
              className="rounded-[--radius-button] border border-oa-stone-200 bg-oa-white px-4 py-2 text-sm font-semibold text-oa-black-700 hover:bg-oa-sand-100"
            >
              Next →
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

        {campusPlans.length > 0 ? (
          <CampusTabs
            campusPlans={campusPlans}
            activeCampusName={activeCampus?.campusName ?? null}
            weekStart={weekStart}
          />
        ) : null}

        <section className="mt-5 space-y-5">
          {activeCampus ? (
            <CampusPlanCard
              key={activeCampus.campusName}
              campusName={activeCampus.campusName}
              plan={activeCampus.plan}
            />
          ) : (
            <div className="rounded-[--radius-card] border border-oa-stone-200 bg-oa-white px-5 py-5 shadow-[--shadow-card]">
              <h2 className="text-xl font-black tracking-tight">
                No Planning Center campuses found
              </h2>
              <p className="mt-2 text-sm text-oa-stone-300">
                The Planning Center lookup did not return campus plan slots for
                this weekend.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CampusTabs({
  campusPlans,
  activeCampusName,
  weekStart,
}: {
  campusPlans: Array<{ campusName: string; plan: WeekendPlanSummary | null }>;
  activeCampusName: string | null;
  weekStart: string;
}) {
  return (
    <nav
      aria-label="Planning Center campus plans"
      className="flex gap-2 overflow-x-auto rounded-[--radius-card] border border-oa-stone-200 bg-oa-white p-2 shadow-[--shadow-card]"
    >
      {campusPlans.map(({ campusName, plan }) => {
        const isActive = campusName === activeCampusName;
        return (
          <Link
            key={campusName}
            href={`/planning-center/week/${weekStart}?campus=${slugifyCampus(campusName)}`}
            aria-current={isActive ? "page" : undefined}
            className={`min-w-[180px] rounded-[14px] border px-4 py-3 text-left transition-colors duration-[220ms] ${
              isActive
                ? "border-oa-black-900 bg-oa-black-900 text-oa-white"
                : "border-oa-stone-200 bg-[#fffdf8] text-oa-black-900 hover:bg-oa-sand-100/45"
            }`}
          >
            <div className="text-sm font-black">{campusName}</div>
            <div
              className={`mt-1 text-xs font-semibold ${
                isActive ? "text-oa-stone-100" : "text-oa-stone-300"
              }`}
            >
              {plan ? `${plan.serviceItems.length} service items` : "No plan"}
            </div>
          </Link>
        );
      })}
    </nav>
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
            <SongsBlock songs={plan.songs} fallbackUrl={plan.planUrl} />
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
              <ServiceItemPanel key={item.id} item={item} />
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
            <PersonPill
              key={`${title}-${person.name}`}
              name={person.name}
              pcoPersonId={person.pcoPersonId}
            />
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
            <TeamAssignmentCard
              key={`${assignment.role ?? "role"}-${assignment.name}`}
              assignment={assignment}
            />
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

function TeamAssignmentCard({
  assignment,
}: {
  assignment: PlanningCenterTeamAssignment;
}) {
  const personUrl = getPersonUrl(assignment.pcoPersonId);
  const content = (
    <>
      <div className="font-bold text-oa-black-900">{assignment.name}</div>
      <div className="mt-0.5 text-oa-black-700">
        {assignment.role ?? "Unassigned role"}
      </div>
    </>
  );
  const className =
    "block rounded-[12px] border border-oa-stone-200 bg-oa-white px-3 py-2 text-xs";

  if (!personUrl) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a
      href={personUrl}
      target="_blank"
      rel="noreferrer"
      className={`${className} hover:bg-oa-sand-100/45`}
    >
      {content}
    </a>
  );
}

function PersonPill({
  name,
  pcoPersonId,
}: {
  name: string;
  pcoPersonId: string | null | undefined;
}) {
  const personUrl = getPersonUrl(pcoPersonId);

  if (!personUrl) {
    return (
      <span className="rounded-full border border-oa-stone-200 bg-oa-white px-3 py-1.5 text-sm font-semibold">
        {name}
      </span>
    );
  }

  return (
    <a
      href={personUrl}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-oa-stone-200 bg-oa-white px-3 py-1.5 text-sm font-semibold hover:bg-oa-sand-100/45"
    >
      {name}
    </a>
  );
}

function SongsBlock({
  songs,
  fallbackUrl,
}: {
  songs: WeekendPlanSummary["songs"];
  fallbackUrl: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
        Songs
      </div>
      <div className="mt-2 space-y-2">
        {songs.length > 0 ? (
          songs.map((song) => (
            <a
              key={`${song.title}-${song.sourceUrl ?? ""}`}
              href={song.sourceUrl ?? fallbackUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[14px] border border-oa-stone-200 bg-oa-sand-100/20 px-3 py-2 hover:bg-oa-sand-100/45"
            >
              <div className="text-sm font-bold">{song.title}</div>
              <div className="mt-0.5 text-xs text-oa-black-700">
                {[song.key, song.songLeader].filter(Boolean).join(" / ") ||
                  "No key or leader"}
              </div>
              <div className="mt-1 text-[11px] text-oa-stone-300">
                {[song.author, song.ccliNumber ? `CCLI ${song.ccliNumber}` : null]
                  .filter(Boolean)
                  .join(" / ") || "No metadata"}
              </div>
            </a>
          ))
        ) : (
          <p className="text-sm text-oa-stone-300">No songs found.</p>
        )}
      </div>
    </div>
  );
}

function ServiceItemPanel({ item }: { item: PlanningCenterServiceItem }) {
  return (
    <details
      className="group rounded-[16px] border border-oa-stone-200 bg-[#fffdf8] px-4 py-3 open:bg-oa-white"
    >
      <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[56px_1fr_auto] [&::-webkit-details-marker]:hidden">
        <div className="text-xs font-black text-oa-stone-300">
          {item.sequence != null ? String(item.sequence).padStart(2, "0") : "--"}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black">
              {item.title || "Untitled"}
            </span>
            {item.itemType ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  item.itemType === "song"
                    ? "bg-oa-yellow-500/15 text-oa-yellow-600"
                    : "bg-oa-stone-100 text-oa-black-700"
                }`}
              >
                {item.itemType}
              </span>
            ) : null}
            {item.keyName ? (
              <span className="rounded-full bg-oa-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-oa-yellow-600">
                Key {item.keyName}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-oa-black-700">
            {item.song?.songLeader ? <span>By {item.song.songLeader}</span> : null}
            {item.notes.length > 0 ? <span>{item.notes.length} note(s)</span> : null}
            {item.sourceUrl ? <span>Planning Center link</span> : null}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 text-xs font-semibold text-oa-stone-300 md:justify-end">
          <span>{formatDuration(item.lengthSeconds)}</span>
          <span className="text-oa-black-700 transition-transform duration-[220ms] group-open:rotate-90">
            →
          </span>
        </div>
      </summary>

      <div className="mt-4 grid gap-4 border-t border-oa-stone-200/60 pt-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <DetailBlock label="Description">
            {item.description ? (
              <p className="text-sm leading-6 text-oa-black-700">
                {item.description}
              </p>
            ) : (
              <p className="text-sm text-oa-stone-300">No description.</p>
            )}
          </DetailBlock>
          <DetailBlock label="Notes">
            {item.notes.length > 0 ? (
              <div className="space-y-2">
                {item.notes.map((note, index) => (
                  <div
                    key={`${item.id}-note-${index}`}
                    className="rounded-[12px] border border-oa-stone-200 bg-oa-sand-100/20 px-3 py-2"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#007996]">
                      {note.categoryName ?? "Note"}
                    </div>
                    <div className="mt-1 text-sm text-oa-black-700">
                      {note.content ?? "No content"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-oa-stone-300">No notes.</p>
            )}
          </DetailBlock>
        </div>
        <div className="space-y-3">
          <DetailBlock label="Song metadata">
            {item.song ? (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <MetadataTerm label="Key" value={item.song.key} />
                <MetadataTerm label="Leader" value={item.song.songLeader} />
                <MetadataTerm label="Author" value={item.song.author} />
                <MetadataTerm label="CCLI" value={item.song.ccliNumber} />
                <MetadataTerm label="Themes" value={item.song.themes} wide />
              </dl>
            ) : (
              <p className="text-sm text-oa-stone-300">Not a linked song.</p>
            )}
          </DetailBlock>
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-[--radius-button] bg-oa-black-900 px-4 py-2 text-sm font-semibold text-oa-white hover:bg-oa-black-700"
            >
              Open item in Planning Center
            </a>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-oa-stone-300">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MetadataTerm({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="font-bold uppercase tracking-[0.12em] text-oa-stone-300">
        {label}
      </dt>
      <dd className="mt-0.5 text-oa-black-700">{value ?? "Not set"}</dd>
    </div>
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

function shiftWeek(weekStart: string, days: number) {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function slugifyCampus(campusName: string) {
  return campusName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getPersonUrl(pcoPersonId: string | null | undefined) {
  if (!pcoPersonId) return undefined;
  return `https://services.planningcenteronline.com/people/${pcoPersonId}`;
}
