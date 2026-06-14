import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { db, activitiesTable, activityAttendanceTable, studentsTable, scanEventsTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody, MarkAttendanceBody, UpdateAttendanceBody } from "@workspace/api-zod";
import { computeStudentState } from "../lib/state-engine";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatActivity(a: typeof activitiesTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    activityType: a.activityType,
    description: a.description,
    responsibleStaffId: a.responsibleStaffId,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime?.toISOString() ?? null,
    status: a.status,
    recurrencePattern: a.recurrencePattern,
    recurrenceGroupId: a.recurrenceGroupId,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

const MAX_OCCURRENCES = 60;

/**
 * Build the list of start Date objects for a recurrence rule, beginning at the
 * provided first start time. Returns at least the first occurrence.
 */
function buildOccurrenceStarts(
  firstStart: Date,
  recurrence: { frequency: string; weekdays?: number[]; until?: string | null; count?: number | null }
): Date[] {
  const starts: Date[] = [];
  const { frequency } = recurrence;

  let untilDate: Date | null = null;
  if (recurrence.until) {
    const parsed = new Date(`${recurrence.until}T23:59:59`);
    if (!isNaN(parsed.getTime())) untilDate = parsed;
  }
  const count =
    recurrence.count && recurrence.count > 0 ? Math.min(recurrence.count, MAX_OCCURRENCES) : null;

  if (frequency === "weekly") {
    const weekdays =
      recurrence.weekdays && recurrence.weekdays.length > 0
        ? [...new Set(recurrence.weekdays)].filter((d) => d >= 0 && d <= 6)
        : [firstStart.getDay()];

    const cursor = new Date(firstStart);
    while (starts.length < MAX_OCCURRENCES) {
      if (weekdays.includes(cursor.getDay()) && cursor.getTime() >= firstStart.getTime()) {
        starts.push(new Date(cursor));
        if (count && starts.length >= count) break;
      }
      cursor.setDate(cursor.getDate() + 1);
      if (untilDate && cursor.getTime() > untilDate.getTime()) break;
      if (!untilDate && !count && starts.length >= 1) break;
    }
  } else {
    // daily
    const cursor = new Date(firstStart);
    while (starts.length < MAX_OCCURRENCES) {
      starts.push(new Date(cursor));
      if (count && starts.length >= count) break;
      cursor.setDate(cursor.getDate() + 1);
      if (untilDate && cursor.getTime() > untilDate.getTime()) break;
      if (!untilDate && !count) break;
    }
  }

  if (starts.length === 0) starts.push(new Date(firstStart));
  return starts;
}

router.get("/activities", requireAuth, async (req, res): Promise<void> => {
  const { activityType, status, date } = req.query as Record<string, string | undefined>;
  const user = (req as Request & { user: JwtPayload }).user;

  let activities = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.schoolId, user.schoolId));

  if (activityType) {
    activities = activities.filter((a) => a.activityType === activityType);
  }
  if (status) {
    activities = activities.filter((a) => a.status === status);
  }

  const attendanceAll = await db
    .select()
    .from(activityAttendanceTable)
    .where(eq(activityAttendanceTable.schoolId, user.schoolId));

  const result = activities.map((a) => {
    const attendance = attendanceAll.filter((att) => att.activityId === a.id);
    const presentCount = attendance.filter((att) => att.status === "present").length;
    return {
      ...formatActivity(a),
      expectedCount: attendance.length,
      presentCount,
      missingCount: attendance.length - presentCount,
      staffName: null as string | null,
    };
  });

  res.json(result);
});

router.post("/activities", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const { recurrence, ...activityData } = parsed.data;
  const firstStart = new Date(activityData.startTime);
  const baseEnd = activityData.endTime ? new Date(activityData.endTime) : null;
  const durationMs = baseEnd ? baseEnd.getTime() - firstStart.getTime() : null;

  if (recurrence && (recurrence.frequency === "daily" || recurrence.frequency === "weekly")) {
    const starts = buildOccurrenceStarts(firstStart, recurrence);
    const groupId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rows = starts.map((start) => ({
      name: activityData.name,
      activityType: activityData.activityType,
      description: activityData.description ?? null,
      responsibleStaffId: activityData.responsibleStaffId ?? null,
      schoolId: user.schoolId,
      startTime: start,
      endTime: durationMs != null ? new Date(start.getTime() + durationMs) : null,
      status: activityData.status ?? "upcoming",
      recurrencePattern: recurrence.frequency,
      recurrenceGroupId: groupId,
    }));

    const inserted = await db.insert(activitiesTable).values(rows).returning();
    res.status(201).json(formatActivity(inserted[0]));
    return;
  }

  const [activity] = await db
    .insert(activitiesTable)
    .values({
      name: activityData.name,
      activityType: activityData.activityType,
      description: activityData.description ?? null,
      responsibleStaffId: activityData.responsibleStaffId ?? null,
      schoolId: user.schoolId,
      startTime: firstStart,
      endTime: baseEnd,
      status: activityData.status ?? "upcoming",
    })
    .returning();

  res.status(201).json(formatActivity(activity));
});

router.get("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [activity] = await db
    .select()
    .from(activitiesTable)
    .where(and(eq(activitiesTable.id, id), eq(activitiesTable.schoolId, user.schoolId)));

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  const attendance = await db
    .select()
    .from(activityAttendanceTable)
    .where(
      and(
        eq(activityAttendanceTable.activityId, id),
        eq(activityAttendanceTable.schoolId, user.schoolId)
      )
    );

  const todayEventsForActivity = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.activityId, id),
        eq(scanEventsTable.schoolId, user.schoolId),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    );

  const presentStudentIds = new Set(
    todayEventsForActivity.map((e) => e.studentId)
  );

  const allStudents = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.schoolId, user.schoolId));

  const todayAllEvents = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.schoolId, user.schoolId),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    );

  const eventsByStudent: Record<number, typeof scanEventsTable.$inferSelect[]> = {};
  for (const e of todayAllEvents) {
    if (!eventsByStudent[e.studentId]) eventsByStudent[e.studentId] = [];
    eventsByStudent[e.studentId].push(e);
  }

  function fmtStudent(s: typeof studentsTable.$inferSelect) {
    const { state, lastSeenAt, lastSeenLocation } = computeStudentState(eventsByStudent[s.id] ?? []);
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

  const presentStudents = allStudents
    .filter((s) => presentStudentIds.has(s.id))
    .map(fmtStudent);

  const presentCount = presentStudents.length;
  const expectedCount = attendance.length || allStudents.length;
  const missingStudents = allStudents
    .filter((s) => !presentStudentIds.has(s.id))
    .slice(0, 20)
    .map(fmtStudent);

  res.json({
    ...formatActivity(activity),
    expectedCount,
    presentCount,
    missingCount: expectedCount - presentCount,
    staffName: null,
    presentStudents,
    missingStudents,
  });
});

router.patch("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const parsed = UpdateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof activitiesTable.$inferInsert> = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.activityType !== undefined ? { activityType: parsed.data.activityType } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.responsibleStaffId !== undefined ? { responsibleStaffId: parsed.data.responsibleStaffId } : {}),
    ...(parsed.data.startTime !== undefined ? { startTime: new Date(parsed.data.startTime) } : {}),
    ...(parsed.data.endTime != null ? { endTime: new Date(parsed.data.endTime) } : {}),
  };

  const [activity] = await db
    .update(activitiesTable)
    .set(updateData)
    .where(and(eq(activitiesTable.id, id), eq(activitiesTable.schoolId, user.schoolId)))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.json(formatActivity(activity));
});

router.delete("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [activity] = await db
    .delete(activitiesTable)
    .where(and(eq(activitiesTable.id, id), eq(activitiesTable.schoolId, user.schoolId)))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/activities/:id/attendance", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const attendance = await db
    .select()
    .from(activityAttendanceTable)
    .where(
      and(
        eq(activityAttendanceTable.activityId, id),
        eq(activityAttendanceTable.schoolId, user.schoolId)
      )
    );

  const studentIds = [...new Set(attendance.map((a) => a.studentId))];
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
    attendance.map((a) => ({
      id: a.id,
      activityId: a.activityId,
      studentId: a.studentId,
      status: a.status,
      markedAt: a.markedAt.toISOString(),
      studentName: studentNames[a.studentId] ?? null,
    }))
  );
});

router.post("/activities/:id/attendance", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const activityId = parseInt(raw, 10);
  if (isNaN(activityId)) {
    res.status(400).json({ error: "Invalid activity ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [activity] = await db
    .select()
    .from(activitiesTable)
    .where(and(eq(activitiesTable.id, activityId), eq(activitiesTable.schoolId, user.schoolId)));
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  const { studentId, status } = parsed.data;

  const [studentBelongsToSchool] = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, user.schoolId)));

  if (!studentBelongsToSchool) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(activityAttendanceTable)
    .where(
      and(
        eq(activityAttendanceTable.activityId, activityId),
        eq(activityAttendanceTable.studentId, studentId),
        eq(activityAttendanceTable.schoolId, user.schoolId)
      )
    );

  let record;
  if (existing) {
    [record] = await db
      .update(activityAttendanceTable)
      .set({ status, markedAt: new Date() })
      .where(and(eq(activityAttendanceTable.id, existing.id), eq(activityAttendanceTable.schoolId, user.schoolId)))
      .returning();
  } else {
    [record] = await db
      .insert(activityAttendanceTable)
      .values({ schoolId: user.schoolId, activityId, studentId, status })
      .returning();
  }

  res.status(existing ? 200 : 201).json({
    id: record.id,
    activityId: record.activityId,
    studentId: record.studentId,
    status: record.status,
    markedAt: record.markedAt.toISOString(),
  });
});

router.patch("/activities/:id/attendance/:attendanceId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawAttId = Array.isArray(req.params.attendanceId) ? req.params.attendanceId[0] : req.params.attendanceId;
  const activityId = parseInt(rawId, 10);
  const attendanceId = parseInt(rawAttId, 10);
  if (isNaN(activityId) || isNaN(attendanceId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const parsedUpdate = UpdateAttendanceBody.safeParse(req.body);
  if (!parsedUpdate.success) {
    res.status(400).json({ error: parsedUpdate.error.message });
    return;
  }
  const { status } = parsedUpdate.data;

  const [existing] = await db
    .select()
    .from(activityAttendanceTable)
    .where(
      and(
        eq(activityAttendanceTable.id, attendanceId),
        eq(activityAttendanceTable.activityId, activityId),
        eq(activityAttendanceTable.schoolId, user.schoolId)
      )
    );

  if (!existing) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  const [updated] = await db
    .update(activityAttendanceTable)
    .set({ status, markedAt: new Date() })
    .where(and(eq(activityAttendanceTable.id, attendanceId), eq(activityAttendanceTable.schoolId, user.schoolId)))
    .returning();

  res.json({
    id: updated.id,
    activityId: updated.activityId,
    studentId: updated.studentId,
    status: updated.status,
    markedAt: updated.markedAt.toISOString(),
  });
});

export default router;
