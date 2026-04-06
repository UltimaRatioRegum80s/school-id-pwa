import { Router, type IRouter } from "express";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { db, studentsTable, scanEventsTable } from "@workspace/db";
import { ProcessScanBody } from "@workspace/api-zod";
import { computeStudentState, generateWarnings, formatScanType } from "../lib/state-engine";
import { broadcastStateChange, broadcastDashboardUpdate } from "../lib/socket";
import { requireAuth } from "../lib/auth";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolve QR code input to candidate lookup values.
 * Supports:
 *   - New namespaced format: SCID-[CODE]-STU#### → also try stripping the code prefix
 *   - Legacy format: SCID-STU#### → also try matching qrCode directly
 *   - Raw studentId: DEMO-STU1001 → match studentId directly
 * Returns an array of values to try matching against qrCode OR studentId.
 */
function resolveQrCandidates(input: string): string[] {
  const candidates = new Set<string>([input]);

  const namespacedMatch = input.match(/^SCID-([A-Z]+)-(.+)$/);
  if (namespacedMatch) {
    const [, , rest] = namespacedMatch;
    candidates.add(`SCID-${rest}`);
    candidates.add(rest);
  }

  const legacyMatch = input.match(/^SCID-(.+)$/);
  if (legacyMatch && !namespacedMatch) {
    candidates.add(legacyMatch[1]);
  }

  return Array.from(candidates);
}

router.post("/scan", requireAuth, async (req, res): Promise<void> => {
  const parsed = ProcessScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const { qrCode, scanType, location, activityId, notes } = parsed.data;
  const candidates = resolveQrCandidates(qrCode);

  const qrConditions = candidates.map(c => eq(studentsTable.qrCode, c));
  const idConditions = candidates.map(c => eq(studentsTable.studentId, c));

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(
      and(
        eq(studentsTable.schoolId, user.schoolId),
        or(...qrConditions, ...idConditions)
      )
    );

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const todayEvents = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.schoolId, user.schoolId),
        eq(scanEventsTable.studentId, student.id),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    )
    .orderBy(scanEventsTable.createdAt);

  const warnings = generateWarnings(student, todayEvents, scanType);

  const [scanEvent] = await db
    .insert(scanEventsTable)
    .values({
      schoolId: user.schoolId,
      studentId: student.id,
      scanType,
      location: location ?? null,
      activityId: activityId ?? null,
      notes: notes ?? null,
    })
    .returning();

  const allEvents = [...todayEvents, scanEvent];
  const { state, lastSeenAt, lastSeenLocation } = computeStudentState(allEvents);

  const studentName = `${student.firstName} ${student.lastName}`;
  broadcastStateChange({
    type: "state_changed",
    studentId: student.id,
    studentName,
    newState: state,
    scanType,
    message: `${studentName} ${formatScanType(scanType)}`,
    schoolId: user.schoolId,
  });
  broadcastDashboardUpdate(user.schoolId);

  res.json({
    scanEvent: {
      id: scanEvent.id,
      studentId: scanEvent.studentId,
      scannedById: scanEvent.scannedById,
      scanType: scanEvent.scanType,
      location: scanEvent.location,
      activityId: scanEvent.activityId,
      notes: scanEvent.notes,
      createdAt: scanEvent.createdAt.toISOString(),
      studentName,
    },
    student: {
      id: student.id,
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      className: student.className,
      photoUrl: student.photoUrl,
      qrCode: student.qrCode,
      isActive: student.isActive,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      currentState: state,
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      lastSeenLocation,
    },
    warnings,
  });
});

router.get("/scan/events", requireAuth, async (req, res): Promise<void> => {
  const { studentId, date, limit } = req.query as Record<string, string | undefined>;
  const lim = limit ? parseInt(limit, 10) : 50;
  const user = (req as Request & { user: JwtPayload }).user;

  const conditions = [eq(scanEventsTable.schoolId, user.schoolId)];

  if (studentId) {
    const sid = parseInt(studentId, 10);
    if (!isNaN(sid)) conditions.push(eq(scanEventsTable.studentId, sid));
  }

  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    conditions.push(sql`${scanEventsTable.createdAt} >= ${d} AND ${scanEventsTable.createdAt} <= ${end}`);
  }

  const events = await db
    .select()
    .from(scanEventsTable)
    .where(and(...conditions))
    .orderBy(desc(scanEventsTable.createdAt))
    .limit(lim);

  const studentIds = [...new Set(events.map((e) => e.studentId))];
  let studentsMap: Record<number, { firstName: string; lastName: string }> = {};
  if (studentIds.length > 0) {
    const students = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName })
      .from(studentsTable)
      .where(and(
        eq(studentsTable.schoolId, user.schoolId),
        sql`${studentsTable.id} = ANY(${sql.raw(`ARRAY[${studentIds.join(",")}]::integer[]`)})`
      ));
    studentsMap = Object.fromEntries(students.map((s) => [s.id, s]));
  }

  res.json(
    events.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      scannedById: e.scannedById,
      scanType: e.scanType,
      location: e.location,
      activityId: e.activityId,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      studentName: studentsMap[e.studentId]
        ? `${studentsMap[e.studentId].firstName} ${studentsMap[e.studentId].lastName}`
        : null,
    }))
  );
});

export default router;
