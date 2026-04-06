import { Router, type IRouter } from "express";
import { eq, ilike, and, or, sql, desc } from "drizzle-orm";
import { db, studentsTable, scanEventsTable, schoolsTable, studentQrCodesTable } from "@workspace/db";
import { CreateStudentBody, UpdateStudentBody } from "@workspace/api-zod";
import { computeStudentState } from "../lib/state-engine";
import { requireAuth } from "../lib/auth";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";

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

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const { search, grade, className, status } = req.query as Record<string, string | undefined>;
  const user = (req as Request & { user: JwtPayload }).user;

  let conditions: ReturnType<typeof eq>[] = [eq(studentsTable.schoolId, user.schoolId)];
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
  } else {
    students = await db.select().from(studentsTable).where(and(...conditions));
  }

  const todayStartDate = todayStart();
  const allStudentIds = students.map((s) => s.id);

  let todayEvents: typeof scanEventsTable.$inferSelect[] = [];
  if (allStudentIds.length > 0) {
    todayEvents = await db
      .select()
      .from(scanEventsTable)
      .where(
        and(
          eq(scanEventsTable.schoolId, user.schoolId),
          sql`${scanEventsTable.createdAt} >= ${todayStartDate} AND ${scanEventsTable.studentId} = ANY(${sql.raw(`ARRAY[${allStudentIds.join(",")}]::integer[]`)})`
        )
      )
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

router.post("/students", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [school] = await db
    .select({ code: schoolsTable.code })
    .from(schoolsTable)
    .where(eq(schoolsTable.id, user.schoolId));

  const schoolCode = school?.code ?? "SCH";
  const { studentId, firstName, lastName, grade, className, photoUrl } = parsed.data;
  const scopedStudentId = `${schoolCode}-${studentId}`;
  const qrCode = `SCID-${schoolCode}-${studentId}`;

  const [student] = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(studentsTable)
      .values({ schoolId: user.schoolId, studentId: scopedStudentId, firstName, lastName, grade, className, photoUrl: photoUrl ?? null, qrCode })
      .returning();
    await tx.insert(studentQrCodesTable).values({ studentId: s.id, code: qrCode, isActive: 1 });
    return [s];
  });

  res.status(201).json(formatStudent(student));
});

router.post("/students/import", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;

  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }

  const [school] = await db
    .select({ code: schoolsTable.code })
    .from(schoolsTable)
    .where(eq(schoolsTable.id, user.schoolId));

  const schoolCode = school?.code ?? "SCH";

  let imported = 0;
  const failed: { row: number; studentId: string; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      failed.push({ row: i + 1, studentId: "(invalid)", reason: "Row is not an object" });
      continue;
    }

    const r = row as Record<string, unknown>;
    const sourceRowNum: number = typeof r._rowIndex === "number" ? r._rowIndex : i + 1;
    const rawStudentId = String(r.studentId ?? "").trim();
    const firstName = String(r.firstName ?? "").trim();
    const lastName = String(r.lastName ?? "").trim();
    const grade = String(r.grade ?? "").trim();
    const className = String(r.className ?? "").trim();

    if (!rawStudentId || !firstName || !lastName || !grade || !className) {
      failed.push({ row: sourceRowNum, studentId: rawStudentId || "(empty)", reason: "Missing required field(s)" });
      continue;
    }

    const scopedStudentId = `${schoolCode}-${rawStudentId}`;
    const qrCode = `SCID-${schoolCode}-${rawStudentId}`;

    try {
      await db.transaction(async (tx) => {
        const [s] = await tx.insert(studentsTable).values({
          schoolId: user.schoolId,
          studentId: scopedStudentId,
          firstName,
          lastName,
          grade,
          className,
          photoUrl: null,
          qrCode,
        }).returning();
        await tx.insert(studentQrCodesTable).values({ studentId: s.id, code: qrCode, isActive: 1 });
      });
      imported++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as Record<string, unknown>)?.code;
      const isDuplicate = code === "23505" || message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique");
      const reason = isDuplicate ? "Duplicate student ID" : "Insert failed";
      failed.push({ row: sourceRowNum, studentId: rawStudentId, reason });
    }
  }

  res.json({ imported, failed });
});

router.get("/students/lookup/:qrCode", requireAuth, async (req, res): Promise<void> => {
  const rawQr = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;
  const user = (req as Request & { user: JwtPayload }).user;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(
      and(
        eq(studentsTable.schoolId, user.schoolId),
        or(eq(studentsTable.qrCode, rawQr), eq(studentsTable.studentId, rawQr))
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
    .orderBy(desc(scanEventsTable.createdAt));

  res.json(formatStudent(student, todayEvents));
});

router.get("/students/print", requireAuth, async (req, res): Promise<void> => {
  const { grade, className } = req.query as Record<string, string | undefined>;
  const user = (req as Request & { user: JwtPayload }).user;

  const [school] = await db
    .select({ name: schoolsTable.name, code: schoolsTable.code, logoUrl: schoolsTable.logoUrl, colorPalette: schoolsTable.colorPalette })
    .from(schoolsTable)
    .where(eq(schoolsTable.id, user.schoolId));

  let conditions: ReturnType<typeof eq>[] = [
    eq(studentsTable.schoolId, user.schoolId),
    eq(studentsTable.isActive, 1),
  ];
  if (grade) conditions.push(eq(studentsTable.grade, grade));
  if (className) conditions.push(eq(studentsTable.className, className));

  const students = await db
    .select({
      id: studentsTable.id,
      studentId: studentsTable.studentId,
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
      grade: studentsTable.grade,
      className: studentsTable.className,
      qrCode: studentsTable.qrCode,
    })
    .from(studentsTable)
    .where(and(...conditions))
    .orderBy(studentsTable.grade, studentsTable.className, studentsTable.lastName);

  res.json({
    students,
    branding: {
      schoolName: school?.name ?? "School",
      logoUrl: school?.logoUrl ?? null,
      colorPalette: school?.colorPalette ?? "blue",
      schoolCode: school?.code ?? "SCH",
    },
  });
});

router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId)));

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
        eq(scanEventsTable.studentId, id),
        sql`${scanEventsTable.createdAt} >= ${todayStart()}`
      )
    )
    .orderBy(scanEventsTable.createdAt);

  const { state, lastSeenAt, lastSeenLocation } = computeStudentState(todayEvents);

  const behaviorLogs = await db.execute(
    sql`SELECT bl.*, bc.name as category_name FROM behavior_logs bl LEFT JOIN behavior_categories bc ON bl.category_id = bc.id WHERE bl.student_id = ${id} AND bl.school_id = ${user.schoolId} ORDER BY bl.created_at DESC LIMIT 10`
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

router.patch("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId)))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(formatStudent(student));
});

router.delete("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [student] = await db
    .delete(studentsTable)
    .where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId)))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/students/:id/qr-codes", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [student] = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId)));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const codes = await db
    .select()
    .from(studentQrCodesTable)
    .where(eq(studentQrCodesTable.studentId, id))
    .orderBy(desc(studentQrCodesTable.createdAt));

  res.json(codes.map((c) => ({
    id: c.id,
    studentId: c.studentId,
    code: c.code,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/students/:id/qr-codes/regenerate", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId)));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [school] = await db
    .select({ code: schoolsTable.code })
    .from(schoolsTable)
    .where(eq(schoolsTable.id, user.schoolId));

  const schoolCode = school?.code ?? "SCH";
  const rawStudentId = student.studentId.replace(`${schoolCode}-`, "");
  const timestamp = Date.now();
  const newQrCode = `SCID-${schoolCode}-${rawStudentId}-${timestamp}`;

  const newCode = await db.transaction(async (tx) => {
    await tx
      .update(studentQrCodesTable)
      .set({ isActive: 0 })
      .where(and(eq(studentQrCodesTable.studentId, id), eq(studentQrCodesTable.isActive, 1)));

    const [inserted] = await tx
      .insert(studentQrCodesTable)
      .values({ studentId: id, code: newQrCode, isActive: 1 })
      .returning();

    await tx
      .update(studentsTable)
      .set({ qrCode: newQrCode })
      .where(eq(studentsTable.id, id));

    return inserted;
  });

  res.json({
    id: newCode.id,
    studentId: newCode.studentId,
    code: newCode.code,
    isActive: newCode.isActive,
    createdAt: newCode.createdAt.toISOString(),
  });
});

export default router;
