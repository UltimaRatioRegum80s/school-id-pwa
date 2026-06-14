import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, studentsTable, scanEventsTable, schoolSettingsTable } from "@workspace/db";
import { computeStudentState, isLateArrival, formatScanType } from "../lib/state-engine";
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

  const [settingsRow] = await db
    .select()
    .from(schoolSettingsTable)
    .where(eq(schoolSettingsTable.schoolId, user.schoolId));
  const schoolStartTime = settingsRow?.startTime ?? "07:30";

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
  const notArrived = studentsWithState.filter((s) => s.state === "not_arrived");
  const onCampus = studentsWithState.filter((s) => s.state === "on_campus");
  const inClass = studentsWithState.filter((s) => s.state === "in_class");
  const atEvent = studentsWithState.filter((s) => s.state === "at_event");
  const checkedOut = studentsWithState.filter((s) => s.state === "checked_out");
  const unaccounted = studentsWithState.filter((s) => s.state === "unaccounted");

  const present = total - notArrived.length;
  const lateArrivals = studentsWithState.filter(
    (s) => s.state !== "not_arrived" && isLateArrival(s.events, schoolStartTime)
  );

  const kpis = {
    total,
    present,
    absent: notArrived.length,
    late: lateArrivals.length,
    checkedOut: checkedOut.length,
    unaccounted: unaccounted.length,
    onCampus: onCampus.length,
    inClass: inClass.length,
    atEvent: atEvent.length,
  };

  const statusDistribution = [
    { state: "not_arrived", count: notArrived.length },
    { state: "on_campus", count: onCampus.length },
    { state: "in_class", count: inClass.length },
    { state: "at_event", count: atEvent.length },
    { state: "checked_out", count: checkedOut.length },
    { state: "unaccounted", count: unaccounted.length },
  ];

  const gradeStatMap: Record<string, { present: number; notArrived: number; total: number }> = {};
  for (const sw of studentsWithState) {
    const g = sw.student.grade;
    if (!gradeStatMap[g]) gradeStatMap[g] = { present: 0, notArrived: 0, total: 0 };
    gradeStatMap[g].total += 1;
    if (sw.state === "not_arrived") {
      gradeStatMap[g].notArrived += 1;
    } else if (sw.state === "on_campus" || sw.state === "in_class" || sw.state === "at_event") {
      gradeStatMap[g].present += 1;
    }
  }
  const byGrade = Object.entries(gradeStatMap)
    .map(([grade, v]) => ({ grade, present: v.present, notArrived: v.notArrived, total: v.total }))
    .sort((a, b) =>
      a.grade.localeCompare(b.grade, undefined, { numeric: true, sensitivity: "base" })
    );

  const exceptions = {
    missingFromClass: notArrived
      .slice(0, 10)
      .map((s) => formatStudentWithState(s.student, s.events)),
    unaccountedStudents: unaccounted.map((s) => formatStudentWithState(s.student, s.events)),
    lateArrivals: lateArrivals.slice(0, 10).map((s) => formatStudentWithState(s.student, s.events)),
    checkedOutWithoutReason: checkedOut
      .filter((s) => {
        const checkout = s.events.find(
          (e) => e.scanType === "gate_out" || e.scanType === "checkout"
        );
        return checkout && !checkout.notes;
      })
      .map((s) => formatStudentWithState(s.student, s.events)),
  };

  const presentStudents = [...onCampus, ...inClass, ...atEvent];
  const studentsByState = {
    present: presentStudents.slice(0, 8).map((s) => formatStudentWithState(s.student, s.events)),
    notArrived: notArrived.slice(0, 8).map((s) => formatStudentWithState(s.student, s.events)),
    late: lateArrivals.slice(0, 8).map((s) => formatStudentWithState(s.student, s.events)),
    unaccounted: unaccounted.slice(0, 8).map((s) => formatStudentWithState(s.student, s.events)),
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
