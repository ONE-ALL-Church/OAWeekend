import Link from "next/link";
import { getCalendarSourceSnapshotForWeek } from "@/lib/calendar-source-snapshot";
import {
  getWeekendPlansForWeek,
  type PlanningCenterPerson,
  type PlanningCenterPlanTimeSummary,
  type PlanningCenterServiceItem,
  type PlanningCenterTeamAssignment,
  type WeekendPlanSummary,
} from "@/lib/planning-center";
import { getSermonForWeek } from "@/lib/rock";
import { SourceComparisonPanel } from "./source-comparison-panel";

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
  const [planningCenterResult, rockResult, calendarSnapshotResult] =
    await Promise.allSettled([
      getWeekendPlansForWeek(weekStart),
      getSermonForWeek(weekStart),
      getCalendarSourceSnapshotForWeek(weekStart),
    ]);

  const planningCenter =
    planningCenterResult.status === "fulfilled"
      ? planningCenterResult.value
      : null;
  const rockSermon =
    rockResult.status === "fulfilled" ? rockResult.value : null;
  const calendarSnapshot =
    calendarSnapshotResult.status === "fulfilled"
      ? calendarSnapshotResult.value
      : null;
  const error =
    planningCenterResult.status === "rejected"
      ? planningCenterResult.reason instanceof Error
        ? planningCenterResult.reason.message
        : "Planning Center lookup failed"
      : null;
  const rockError =
    rockResult.status === "rejected"
      ? rockResult.reason instanceof Error
        ? rockResult.reason.message
        : "Rock lookup failed"
      : null;
  const calendarError =
    calendarSnapshotResult.status === "rejected"
      ? calendarSnapshotResult.reason instanceof Error
        ? calendarSnapshotResult.reason.message
        : "Calendar source row lookup failed"
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
      <div className="border-b border-oa-stone-200/70 bg-[#fffaf0]/95 px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              Weekend Service Plan
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-oa-black-700">
              A read-only Planning Center workspace for {formatWeekDate(weekStart)}.
              Campus service order stays primary; source health, teams, and
              calendar-managed rows stay visible without taking over the page.
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

      <div className="mx-auto max-w-7xl px-6 py-6">
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
          <div className="sticky top-0 z-20 -mx-6 mb-5 border-y border-oa-stone-200/70 bg-[#f7f3ea]/95 px-6 py-3 backdrop-blur">
            <CampusTabs
              campusPlans={campusPlans}
              activeCampusName={activeCampus?.campusName ?? null}
              weekStart={weekStart}
            />
          </div>
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

        <SourceComparisonPanel
          rockSermon={rockSermon}
          rockError={rockError}
          planningCenter={planningCenter}
          planningCenterError={error}
          calendarSnapshot={calendarSnapshot}
          calendarError={calendarError}
        />
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
            className={`min-w-[220px] rounded-[14px] border px-4 py-3 text-left transition-colors duration-[220ms] ${
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
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
            className="self-start rounded-[--radius-button] bg-oa-black-900 px-4 py-2 text-sm font-semibold text-oa-white hover:bg-oa-black-700"
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
            value={formatServiceTimesSummary(plan.serviceTimes)}
          />
          <Metric
            label="All plan times"
            value={`${plan.planTimes.length} time${plan.planTimes.length === 1 ? "" : "s"}`}
          />
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="px-5 py-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
                Primary workspace
              </div>
              <h3 className="mt-1 text-xl font-black tracking-tight">
                Service Order
              </h3>
            </div>
            <span className="rounded-full border border-oa-stone-200 bg-oa-white px-3 py-1 text-xs font-bold text-oa-stone-300">
              {plan.serviceItems.length} items
            </span>
          </div>
          <div className="space-y-2.5">
            <ServiceOrderSections items={plan.serviceItems} />
          </div>
        </div>

        <aside className="border-t border-oa-stone-200/60 bg-[#fffaf0]/70 px-5 py-5 lg:border-l lg:border-t-0">
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
              Campus sources
            </div>
            <p className="mt-1 text-sm leading-6 text-oa-black-700">
              Source-of-truth data from Planning Center. These values are not
              editable in this interface.
            </p>
          </div>
          <PeopleBlock title="Hosts" people={plan.hosts} />
          <div className="mt-5">
            <PeopleBlock
              title="Worship Leaders"
              people={plan.worshipLeaders}
            />
          </div>
          <div className="mt-5">
            <SongsBlock songs={plan.songs} fallbackUrl={plan.planUrl} />
          </div>
          <div className="mt-5">
            <PlanTimesBlock times={plan.planTimes} />
          </div>
          <div className="mt-5">
            <TeamAssignmentsBlock assignments={plan.teamMembers} />
          </div>
        </aside>
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
    <details className="group rounded-[14px] border border-oa-stone-200 bg-oa-white px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
          Plan Times
        </span>
        <span className="flex items-center gap-2 text-[11px] font-bold text-oa-stone-300">
          {times.length} time{times.length === 1 ? "" : "s"}
          <span className="text-oa-black-700 transition-transform duration-[220ms] group-open:rotate-90">
            →
          </span>
        </span>
      </summary>
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
    </details>
  );
}

function TeamAssignmentsBlock({
  assignments,
}: {
  assignments: PlanningCenterTeamAssignment[];
}) {
  const groups = groupTeamAssignments(assignments);

  return (
    <details className="group rounded-[14px] border border-oa-stone-200 bg-oa-white px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-oa-stone-300">
          Team Assignments
        </span>
        <span className="flex items-center gap-2 text-[11px] font-bold text-oa-stone-300">
          {assignments.length} people
          <span className="text-oa-black-700 transition-transform duration-[220ms] group-open:rotate-90">
            →
          </span>
        </span>
      </summary>
      <div className="mt-2 space-y-1.5">
        {groups.length > 0 ? (
          groups.map(({ role, members }) => (
            <details
              key={role}
              className="rounded-[12px] border border-oa-stone-200 bg-oa-white px-3 py-2 open:bg-[#fffdf8]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-black text-oa-black-900">
                  {role}
                </span>
                <span className="flex items-center gap-2 text-[11px] font-bold text-oa-stone-300">
                  {members.length}
                  <span className="text-oa-black-700">→</span>
                </span>
              </summary>
              <div className="mt-2 space-y-1.5 border-t border-oa-stone-200/60 pt-2">
                {members.map((assignment) => (
                  <TeamAssignmentCard
                    key={`${assignment.role ?? "role"}-${assignment.name}`}
                    assignment={assignment}
                  />
                ))}
              </div>
            </details>
          ))
        ) : (
          <span className="text-sm text-oa-stone-300">
            No active team assignments
          </span>
        )}
      </div>
    </details>
  );
}

function groupTeamAssignments(assignments: PlanningCenterTeamAssignment[]) {
  const groups = new Map<string, PlanningCenterTeamAssignment[]>();

  for (const assignment of assignments) {
    const role = assignment.role ?? "Unassigned role";
    const members = groups.get(role) ?? [];
    members.push(assignment);
    groups.set(role, members);
  }

  return Array.from(groups.entries()).map(([role, members]) => ({
    role,
    members,
  }));
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
    "block rounded-[10px] border border-oa-stone-200 bg-oa-white px-3 py-2 text-xs";

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

function ServiceOrderSections({
  items,
}: {
  items: PlanningCenterServiceItem[];
}) {
  const sections = groupServiceItemsByHeader(items);

  return (
    <div className="space-y-3">
      {sections.map((section, index) =>
        section.header ? (
          <ServiceHeaderSection
            key={section.header.id}
            header={section.header}
            items={section.items}
          />
        ) : (
          <div key={`service-items-${index}`} className="space-y-2.5">
            {section.items.map((item) => (
              <ServiceItemPanel key={item.id} item={item} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function ServiceHeaderSection({
  header,
  items,
}: {
  header: PlanningCenterServiceItem;
  items: PlanningCenterServiceItem[];
}) {
  return (
    <details
      open
      className="rounded-[18px] border border-oa-stone-200 bg-[#fffdf8] transition-colors duration-[220ms] open:bg-oa-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-base font-black uppercase tracking-[0.24em] text-oa-black-900">
            {header.title || "Section"}
          </div>
          {items.length > 0 ? (
            <div className="mt-1 text-xs font-semibold text-oa-black-700">
              {items.length} item{items.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
        <span className="text-oa-black-700">
          →
        </span>
      </summary>
      {items.length > 0 ? (
        <div className="space-y-2.5 border-t border-oa-stone-200/60 bg-oa-white/45 px-4 py-3">
          {items.map((item) => (
            <ServiceItemPanel key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </details>
  );
}

function groupServiceItemsByHeader(items: PlanningCenterServiceItem[]) {
  const sections: Array<{
    header: PlanningCenterServiceItem | null;
    items: PlanningCenterServiceItem[];
  }> = [];
  let currentSection: {
    header: PlanningCenterServiceItem | null;
    items: PlanningCenterServiceItem[];
  } | null = null;

  for (const item of items) {
    if (item.itemType === "header") {
      currentSection = { header: item, items: [] };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = { header: null, items: [] };
      sections.push(currentSection);
    }

    currentSection.items.push(item);
  }

  return sections;
}

function ServiceItemPanel({ item }: { item: PlanningCenterServiceItem }) {
  const isSong = item.itemType === "song";

  return (
    <details
      className={`group rounded-[18px] border bg-[#fffdf8] px-4 py-3 transition-colors duration-[220ms] open:bg-oa-white ${
        isSong
          ? "border-oa-yellow-500/35 shadow-[inset_4px_0_0_rgba(250,204,21,0.5)]"
          : "border-oa-stone-200 hover:border-oa-stone-300"
      }`}
    >
      <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[48px_minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-oa-stone-200 bg-oa-white text-xs font-black text-oa-stone-300">
          {item.sequence != null ? String(item.sequence).padStart(2, "0") : "--"}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black leading-6 text-oa-black-900">
              {item.title || "Untitled"}
            </span>
            {isSong ? (
              <span className="rounded-full bg-oa-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-oa-yellow-600">
                Song
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
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 text-xs font-semibold text-oa-stone-300 md:justify-end">
          <span className="rounded-full border border-oa-stone-200 bg-oa-white px-2.5 py-1 text-oa-black-700">
            {formatDuration(item.lengthSeconds)}
          </span>
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

function formatServiceTimesSummary(serviceTimes: string[]) {
  if (serviceTimes.length === 0) return "Not set";
  if (serviceTimes.length <= 2) return serviceTimes.join(", ");
  return `${serviceTimes.slice(0, 2).join(", ")} + ${serviceTimes.length - 2} more`;
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
