import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, activitiesTable, activityAttendanceTable, studentsTable, scanEventsTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody } from "@workspace/api-zod";
import { computeStudentState } from "../lib/state-engine";

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
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

router.get("/activities", async (req, res): Promise<void> => {
  const { activityType, status, date } = req.query as Record<string, string | undefined>;

  let activities = await db.select().from(activitiesTable);

  if (activityType) {
    activities = activities.filter((a) => a.activityType === activityType);
  }
  if (status) {
    activities = activities.filter((a) => a.status === status);
  }

  const attendanceAll = await db.select().from(activityAttendanceTable);

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

router.post("/activities", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [activity] = await db
    .insert(activitiesTable)
    .values({
      ...parsed.data,
      startTime: new Date(parsed.data.startTime),
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      status: parsed.data.status ?? "upcoming",
    })
    .returning();

  res.status(201).json(formatActivity(activity));
});

router.get("/activities/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [activity] = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.id, id));

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  const attendance = await db
    .select()
    .from(activityAttendanceTable)
    .where(eq(activityAttendanceTable.activityId, id));

  const todayEventsForActivity = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.activityId, id),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    );

  const presentStudentIds = new Set(
    todayEventsForActivity.map((e) => e.studentId)
  );

  const allStudents = await db.select().from(studentsTable);
  const todayAllEvents = await db
    .select()
    .from(scanEventsTable)
    .where(sql`${scanEventsTable.createdAt} >= ${todayStart()}`);

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

router.patch("/activities/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

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
    .where(eq(activitiesTable.id, id))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.json(formatActivity(activity));
});

router.delete("/activities/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [activity] = await db
    .delete(activitiesTable)
    .where(eq(activitiesTable.id, id))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/activities/:id/attendance", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const attendance = await db
    .select()
    .from(activityAttendanceTable)
    .where(eq(activityAttendanceTable.activityId, id));

  const studentIds = [...new Set(attendance.map((a) => a.studentId))];
  const studentNames: Record<number, string> = {};
  if (studentIds.length > 0) {
    const students = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName })
      .from(studentsTable)
      .where(sql`${studentsTable.id} = ANY(${sql.raw(`ARRAY[${studentIds.join(",")}]::integer[]`)})`)
    ;
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

export default router;
