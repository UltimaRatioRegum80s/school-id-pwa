import { Router, type IRouter } from "express";
import { eq, ilike, and, or, sql, desc } from "drizzle-orm";
import { db, studentsTable, scanEventsTable } from "@workspace/db";
import { CreateStudentBody, UpdateStudentBody } from "@workspace/api-zod";
import { computeStudentState } from "../lib/state-engine";

const router: IRouter = Router();

function formatStudent(s: typeof studentsTable.$inferSelect, events: typeof scanEventsTable.$inferSelect[] = []) {
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

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get("/students", async (req, res): Promise<void> => {
  const { search, grade, className, status } = req.query as Record<string, string | undefined>;

  let conditions: ReturnType<typeof eq>[] = [];
  if (grade) conditions.push(eq(studentsTable.grade, grade));
  if (className) conditions.push(eq(studentsTable.className, className));

  let students;
  if (search) {
    students = await db
      .select()
      .from(studentsTable)
      .where(
        and(
          ...conditions,
          or(
            ilike(studentsTable.firstName, `%${search}%`),
            ilike(studentsTable.lastName, `%${search}%`),
            ilike(studentsTable.studentId, `%${search}%`)
          )
        )
      );
  } else if (conditions.length > 0) {
    students = await db.select().from(studentsTable).where(and(...conditions));
  } else {
    students = await db.select().from(studentsTable);
  }

  const todayStartDate = todayStart();
  const allStudentIds = students.map((s) => s.id);

  let todayEvents: typeof scanEventsTable.$inferSelect[] = [];
  if (allStudentIds.length > 0) {
    todayEvents = await db
      .select()
      .from(scanEventsTable)
      .where(sql`${scanEventsTable.createdAt} >= ${todayStartDate} AND ${scanEventsTable.studentId} = ANY(${sql.raw(`ARRAY[${allStudentIds.join(",")}]::integer[]`)})`)
      .orderBy(desc(scanEventsTable.createdAt));
  }

  const result = students.map((s) => {
    const events = todayEvents.filter((e) => e.studentId === s.id);
    const formatted = formatStudent(s, events);
    if (status && formatted.currentState !== status) return null;
    return formatted;
  }).filter(Boolean);

  res.json(result);
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { studentId, firstName, lastName, grade, className, photoUrl } = parsed.data;
  const qrCode = `SCID-${studentId}`;

  const [student] = await db
    .insert(studentsTable)
    .values({ studentId, firstName, lastName, grade, className, photoUrl: photoUrl ?? null, qrCode })
    .returning();

  res.status(201).json(formatStudent(student));
});

router.get("/students/lookup/:qrCode", async (req, res): Promise<void> => {
  const rawQr = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(or(eq(studentsTable.qrCode, rawQr), eq(studentsTable.studentId, rawQr)));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const todayEvents = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.studentId, student.id),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    )
    .orderBy(desc(scanEventsTable.createdAt));

  res.json(formatStudent(student, todayEvents));
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const todayEvents = await db
    .select()
    .from(scanEventsTable)
    .where(
      and(
        eq(scanEventsTable.studentId, id),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    )
    .orderBy(scanEventsTable.createdAt);

  const { state, lastSeenAt, lastSeenLocation } = computeStudentState(todayEvents);

  const behaviorLogs = await db.execute(
    sql`SELECT bl.*, bc.name as category_name FROM behavior_logs bl LEFT JOIN behavior_categories bc ON bl.category_id = bc.id WHERE bl.student_id = ${id} ORDER BY bl.created_at DESC LIMIT 10`
  );

  const totalMerits = (behaviorLogs.rows as Array<{ type: string; points: number }>)
    .filter((b) => b.type === "merit")
    .reduce((acc, b) => acc + (b.points ?? 0), 0);
  const totalDemerits = (behaviorLogs.rows as Array<{ type: string; points: number }>)
    .filter((b) => b.type === "demerit")
    .reduce((acc, b) => acc + (b.points ?? 0), 0);

  res.json({
    ...formatStudent(student, todayEvents),
    todayTimeline: todayEvents.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      scannedById: e.scannedById,
      scanType: e.scanType,
      location: e.location,
      activityId: e.activityId,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      studentName: `${student.firstName} ${student.lastName}`,
    })),
    behaviorSummary: {
      totalMerits,
      totalDemerits,
      recentLogs: (behaviorLogs.rows as Array<Record<string, unknown>>).slice(0, 5).map((b) => ({
        id: b.id,
        studentId: b.student_id,
        categoryId: b.category_id ?? null,
        type: b.type,
        points: b.points,
        note: b.note ?? null,
        loggedById: b.logged_by_id ?? null,
        createdAt: b.created_at,
        categoryName: b.category_name ?? null,
      })),
    },
    currentState: state,
    lastSeenAt: lastSeenAt?.toISOString() ?? null,
    lastSeenLocation,
  });
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(eq(studentsTable.id, id))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(formatStudent(student));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [student] = await db
    .delete(studentsTable)
    .where(eq(studentsTable.id, id))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
