/**
 * Seed the calendar with default sections and rows.
 * Run: npx tsx apps/web/scripts/seed-calendar.ts
 */
import { init, id } from "@instantdb/admin";
import schema from "../instant.schema";
import {
  CALENDAR_DEFAULT_SECTIONS,
  CALENDAR_DEFAULT_ROWS,
} from "@oaweekend/shared";

const INSTANT_APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const INSTANT_ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;

if (!INSTANT_APP_ID || !INSTANT_ADMIN_TOKEN) {
  console.error("Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in env");
  process.exit(1);
}

const adminDb = init({ appId: INSTANT_APP_ID, adminToken: INSTANT_ADMIN_TOKEN, schema });

async function seed() {
  console.log("Seeding calendar sections and rows...");

  for (const sectionDef of CALENDAR_DEFAULT_SECTIONS) {
    const sectionId = id();
    const txns: Parameters<typeof adminDb.transact>[0] = [
      adminDb.tx.calendarSections[sectionId].update({
        name: sectionDef.name,
        slug: sectionDef.slug,
        color: sectionDef.color,
        sortOrder: sectionDef.sortOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ];

    const rows = CALENDAR_DEFAULT_ROWS[sectionDef.slug] ?? [];
    for (const rowDef of rows) {
      const rowId = id();
      txns.push(
        adminDb.tx.calendarRows[rowId].update({
          name: rowDef.name,
          slug: rowDef.slug,
          fieldType: rowDef.fieldType,
          sortOrder: rowDef.sortOrder,
          campusSpecific: rowDef.campusSpecific,
          createdAt: Date.now(),
        }),
        adminDb.tx.calendarRows[rowId].link({ section: sectionId }),
      );
    }

    await adminDb.transact(txns);
    console.log(`  ✓ ${sectionDef.name} (${rows.length} rows)`);
  }

  // Seed a few weeks (next 8 Saturdays from today)
  console.log("\nSeeding 8 upcoming weeks...");
  const today = new Date();
  const day = today.getDay();
  const diffToSaturday = (6 - day + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + diffToSaturday);

  for (let i = 0; i < 8; i++) {
    const weekDate = new Date(nextSaturday);
    weekDate.setDate(nextSaturday.getDate() + i * 7);
    const weekStart = weekDate.toISOString().slice(0, 10);
    const weekId = id();
    await adminDb.transact(
      adminDb.tx.calendarWeeks[weekId].update({
        weekStart,
        label: "",
        createdAt: Date.now(),
      }),
    );
    console.log(`  ✓ Week: ${weekStart}`);
  }

  console.log("\n✅ Calendar seeded successfully!");
}

seed().catch(console.error);
