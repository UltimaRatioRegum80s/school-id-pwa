import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";

const { scanEventsTable, activitiesTable, activityAttendanceTable } = schema;

const DEMO_ACTIVITY_NAMES = [
  "Morning Assembly",
  "Inter-House Sports",
  "Science Club",
];

type Db = NodePgDatabase<typeof schema>;

interface SeedStudent {
  id: number;
}

/**
 * (Re)generates all time-sensitive demo records (gate-in scan events and the
 * three demo activities) relative to "today" for the given school.
 *
 * It first removes the previously generated demo records so that running it
 * again updates the data in place instead of duplicating it. Only the seeded
 * demo activities (matched by name) and that school's scan events are touched.
 */
export async function refreshDemoTimeSensitiveData(
  db: Db,
  opts: { schoolId: number; adminId: number; students: SeedStudent[] }
): Promise<{ scanEvents: number; activities: number }> {
  const { schoolId, adminId, students } = opts;

  // --- Clear previously generated demo records (idempotent re-seed) ---
  const existingDemoActivities = await db
    .select({ id: activitiesTable.id })
    .from(activitiesTable)
    .where(
      and(
        eq(activitiesTable.schoolId, schoolId),
        inArray(activitiesTable.name, DEMO_ACTIVITY_NAMES)
      )
    );

  if (existingDemoActivities.length > 0) {
    const ids = existingDemoActivities.map((a) => a.id);
    await db
      .delete(activityAttendanceTable)
      .where(inArray(activityAttendanceTable.activityId, ids));
    await db.delete(activitiesTable).where(inArray(activitiesTable.id, ids));
  }

  await db.delete(scanEventsTable).where(eq(scanEventsTable.schoolId, schoolId));

  // --- Scan events relative to today ---
  const now = new Date();
  const today7am = new Date(now);
  today7am.setHours(7, 0, 0, 0);

  const checkedIn = students.slice(0, Math.floor(students.length * 0.75));
  const scanEvents = checkedIn.map((s, i) => {
    const minutesAfterOpen = Math.floor(Math.random() * 45);
    const scanTime = new Date(today7am.getTime() + minutesAfterOpen * 60000 + i * 1000);
    return {
      schoolId,
      studentId: s.id,
      scanType: "gate_in" as const,
      location: "Main Gate",
      activityId: null as number | null,
      notes: null as string | null,
      createdAt: scanTime,
    };
  });

  if (scanEvents.length > 0) {
    await db.insert(scanEventsTable).values(scanEvents);
  }

  // --- Activities relative to today ---
  await db.insert(activitiesTable).values([
    {
      schoolId,
      name: "Morning Assembly",
      activityType: "assembly",
      description: "Daily morning assembly for all students",
      responsibleStaffId: adminId,
      startTime: new Date(today7am.getTime() + 30 * 60000),
      endTime: new Date(today7am.getTime() + 60 * 60000),
      status: "active",
    },
    {
      schoolId,
      name: "Inter-House Sports",
      activityType: "event",
      description: "Annual inter-house sports competition",
      responsibleStaffId: adminId,
      startTime: new Date(now.getTime() + 2 * 60 * 60000),
      endTime: new Date(now.getTime() + 5 * 60 * 60000),
      status: "upcoming",
    },
    {
      schoolId,
      name: "Science Club",
      activityType: "club",
      description: "Weekly science club meeting",
      responsibleStaffId: adminId,
      startTime: new Date(now.getTime() + 24 * 60 * 60000),
      endTime: new Date(now.getTime() + 25 * 60 * 60000),
      status: "upcoming",
    },
  ]);

  return { scanEvents: scanEvents.length, activities: DEMO_ACTIVITY_NAMES.length };
}
