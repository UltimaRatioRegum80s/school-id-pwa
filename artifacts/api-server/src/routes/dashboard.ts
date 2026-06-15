import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, studentsTable, scanEventsTable } from "@workspace/db";
import { computeStudentState, formatScanType } from "../lib/state-engine";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatStudentWithState(
  s: typeof studentsTable.$inferSelect,
  events: typeof scanEventsTable.$inferSelect[]
) {
  const { state, lastSeenAt, lastSeenLocation } = computeStudentState(events);
  return {
    id: s.id,
    studentId: s.studentId,
    firstName: s.firstName,
    lastName: s.lastName,
    grade: s.grade,
    className: s.className,
    photoUrl: s.photoUrl,
    qrCode: s.qrCode,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    currentState: state,
    lastSeenAt: lastSeenAt?.toISOString() ?? null,
    lastSeenLocation,
  };
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const { grade, className } = req.query as { grade?: string; className?: string };
  const todayStartDate = todayStart();
  const user = (req as Request & { user: JwtPayload }).user;

  const allActiveStudents = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.isActive, 1), eq(studentsTable.schoolId, user.schoolId)));

  const availableClassesByGrade: Record<string, string[]> = {};
  for (const s of allActiveStudents) {
    if (!availableClassesByGrade[s.grade]) availableClassesByGrade[s.grade] = [];
    if (!availableClassesByGrade[s.grade].includes(s.className)) {
      availableClassesByGrade[s.grade].push(s.className);
    }
  }
  for (const g of Object.keys(availableClassesByGrade)) {
    availableClassesByGrade[g].sort();
  }

  let students = allActiveStudents;
  if (grade) students = students.filter((s) => s.grade === grade);
  if (className) students = students.filter((s) => s.className === className);

  const todayEvents = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.schoolId, user.schoolId),
        sql`${scanEventsTable.createdAt} >= ${todayStartDate}`
      )
    )
    .orderBy(scanEventsTable.createdAt);

  const eventsByStudent: Record<number, typeof scanEventsTable.$inferSelect[]> = {};
  for (const e of todayEvents) {
    if (!eventsByStudent[e.studentId]) eventsByStudent[e.studentId] = [];
    eventsByStudent[e.studentId].push(e);
  }

  const studentsWithState = students.map((s) => ({
    student: s,
    events: eventsByStudent[s.id] ?? [],
    state: computeStudentState(eventsByStudent[s.id] ?? []).state,
  }));

  const total = students.length;
  const presentList = studentsWithState.filter((s) => s.state === "present");
  const absentList = studentsWithState.filter((s) => s.state === "absent");

  const kpis = {
    total,
    present: presentList.length,
    absent: absentList.length,
  };

  const statusDistribution = [
    { state: "present", count: presentList.length },
    { state: "absent", count: absentList.length },
  ];

  const gradeStatMap: Record<string, { present: number; absent: number; total: number }> = {};
  for (const sw of studentsWithState) {
    const g = sw.student.grade;
    if (!gradeStatMap[g]) gradeStatMap[g] = { present: 0, absent: 0, total: 0 };
    gradeStatMap[g].total += 1;
    if (sw.state === "present") {
      gradeStatMap[g].present += 1;
    } else {
      gradeStatMap[g].absent += 1;
    }
  }
  const byGrade = Object.entries(gradeStatMap)
    .map(([grade, v]) => ({ grade, present: v.present, absent: v.absent, total: v.total }))
    .sort((a, b) =>
      a.grade.localeCompare(b.grade, undefined, { numeric: true, sensitivity: "base" })
    );

  const exceptions = {
    absentStudents: absentList
      .slice(0, 20)
      .map((s) => formatStudentWithState(s.student, s.events)),
  };

  const studentsByState = {
    present: presentList.slice(0, 8).map((s) => formatStudentWithState(s.student, s.events)),
    absent: absentList.slice(0, 8).map((s) => formatStudentWithState(s.student, s.events)),
  };

  const studentNameMap: Record<number, string> = {};
  for (const s of students) {
    studentNameMap[s.id] = `${s.firstName} ${s.lastName}`;
  }

  const filteredStudentIds = students.map((s) => s.id);
  const allRecentEvents = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.schoolId, user.schoolId),
        sql`${scanEventsTable.createdAt} >= ${todayStartDate}`
      )
    )
    .orderBy(desc(scanEventsTable.createdAt))
    .limit(200);

  const filteredFeedEvents = (grade || className)
    ? allRecentEvents.filter((e) => filteredStudentIds.includes(e.studentId))
    : allRecentEvents;

  const recentFeed = filteredFeedEvents.slice(0, 20).map((e) => ({
    id: e.id,
    message: `${studentNameMap[e.studentId] ?? "Unknown"} ${formatScanType(e.scanType)}`,
    studentName: studentNameMap[e.studentId] ?? "Unknown",
    scanType: e.scanType,
    createdAt: e.createdAt.toISOString(),
    studentId: e.studentId,
  }));

  res.json({
    kpis,
    exceptions,
    studentsByState,
    statusDistribution,
    byGrade,
    recentFeed,
    availableClassesByGrade,
    lastUpdated: new Date().toISOString(),
  });
});

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

router.get("/dashboard/trends", requireAuth, async (req, res): Promise<void> => {
  const { grade, className } = req.query as { grade?: string; className?: string };
  const requestedDays = parseInt((req.query.days as string) ?? "", 10);
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), 90)
    : 7;
  const user = (req as Request & { user: JwtPayload }).user;

  let students = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.isActive, 1), eq(studentsTable.schoolId, user.schoolId)));
  if (grade) students = students.filter((s) => s.grade === grade);
  if (className) students = students.filter((s) => s.className === className);
  const total = students.length;
  const studentIdSet = new Set(students.map((s) => s.id));

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  const events = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.schoolId, user.schoolId),
        sql`${scanEventsTable.createdAt} >= ${rangeStart}`
      )
    )
    .orderBy(scanEventsTable.createdAt);

  // events grouped by day key, then by studentId (only for filtered students)
  const eventsByDay: Record<string, Record<number, typeof scanEventsTable.$inferSelect[]>> = {};
  for (const e of events) {
    if (!studentIdSet.has(e.studentId)) continue;
    const key = dayKey(new Date(e.createdAt));
    if (!eventsByDay[key]) eventsByDay[key] = {};
    if (!eventsByDay[key][e.studentId]) eventsByDay[key][e.studentId] = [];
    eventsByDay[key][e.studentId].push(e);
  }

  const points: Array<{
    date: string;
    present: number;
    absent: number;
    total: number;
  }> = [];

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(rangeStart);
    dayDate.setDate(rangeStart.getDate() + i);
    const key = dayKey(dayDate);
    const byStudent = eventsByDay[key] ?? {};

    let present = 0;
    for (const s of students) {
      const studentEvents = byStudent[s.id] ?? [];
      const { state } = computeStudentState(studentEvents);
      if (state === "present") present += 1;
    }

    points.push({ date: key, present, absent: total - present, total });
  }

  res.json(points);
});

router.get("/dashboard/feed", requireAuth, async (req, res): Promise<void> => {
  const lim = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const todayStartDate = todayStart();
  const user = (req as Request & { user: JwtPayload }).user;

  const events = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.schoolId, user.schoolId),
        sql`${scanEventsTable.createdAt} >= ${todayStartDate}`
      )
    )
    .orderBy(desc(scanEventsTable.createdAt))
    .limit(lim);

  const studentIds = [...new Set(events.map((e) => e.studentId))];
  const studentNames: Record<number, string> = {};

  if (studentIds.length > 0) {
    const students = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName })
      .from(studentsTable)
      .where(and(
        eq(studentsTable.schoolId, user.schoolId),
        sql`${studentsTable.id} = ANY(${sql.raw(`ARRAY[${studentIds.join(",")}]::integer[]`)})`
      ));
    for (const s of students) {
      studentNames[s.id] = `${s.firstName} ${s.lastName}`;
    }
  }

  res.json(
    events.map((e) => ({
      id: e.id,
      message: `${studentNames[e.studentId] ?? "Unknown"} ${formatScanType(e.scanType)}`,
      studentName: studentNames[e.studentId] ?? "Unknown",
      scanType: e.scanType,
      createdAt: e.createdAt.toISOString(),
      studentId: e.studentId,
    }))
  );
});

export default router;
