"use client";

import Link from "next/link";
import db from "@/lib/instant";
import { CalendarSettingsPanel } from "@/components/calendar/calendar-settings-panel";

export default function CalendarSettingsPage() {
  const { user } = db.useAuth();

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Please sign in.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-oa-white border-b border-oa-stone-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Calendar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-oa-black-900">
          Calendar Settings
        </h1>
      </div>

      <div className="max-w-[1100px] mx-auto w-full px-8 py-6">
        <CalendarSettingsPanel />
      </div>
    </main>
  );
}
