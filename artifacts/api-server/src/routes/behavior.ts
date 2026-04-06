import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq, desc, and } from "drizzle-orm";
import { db, behaviorLogsTable, behaviorCategoriesTable, studentsTable } from "@workspace/db";
import { CreateBehaviorLogBody, CreateBehaviorCategoryBody, UpdateBehaviorLogBody } from "@workspace/api-zod";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/behavior/categories", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const categories = await db
    .select()
    .from(behaviorCategoriesTable)
    .where(eq(behaviorCategoriesTable.schoolId, user.schoolId));
  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      points: c.points,
      description: c.description,
      createdAt: c.createdAt.toISOString(),
    }))
  );
});

router.post("/behavior/categories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBehaviorCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [category] = await db
    .insert(behaviorCategoriesTable)
    .values({ ...parsed.data, schoolId: user.schoolId })
    .returning();

  res.status(201).json({
    id: category.id,
    name: category.name,
    type: category.type,
    points: category.points,
    description: category.description,
    createdAt: category.createdAt.toISOString(),
  });
});

router.get("/behavior/logs", requireAuth, async (req, res): Promise<void> => {
  const { studentId, type, limit } = req.query as Record<string, string | undefined>;
  const lim = limit ? parseInt(limit, 10) : 50;
  const user = (req as Request & { user: JwtPayload }).user;

  let logs;
  if (studentId) {
    const sid = parseInt(studentId, 10);
    logs = await db
      .select()
      .from(behaviorLogsTable)
      .where(and(eq(behaviorLogsTable.schoolId, user.schoolId), eq(behaviorLogsTable.studentId, sid)))
      .orderBy(desc(behaviorLogsTable.createdAt))
      .limit(lim);
  } else {
    logs = await db
      .select()
      .from(behaviorLogsTable)
      .where(eq(behaviorLogsTable.schoolId, user.schoolId))
      .orderBy(desc(behaviorLogsTable.createdAt))
      .limit(lim);
  }

  if (type) {
    logs = logs.filter((l) => l.type === type);
  }

  const categoryIds = [...new Set(logs.map((l) => l.categoryId).filter(Boolean))] as number[];
  const categoryNames: Record<number, string> = {};
  if (categoryIds.length > 0) {
    for (const cid of categoryIds) {
      const [cat] = await db
        .select({ id: behaviorCategoriesTable.id, name: behaviorCategoriesTable.name })
        .from(behaviorCategoriesTable)
        .where(and(eq(behaviorCategoriesTable.id, cid), eq(behaviorCategoriesTable.schoolId, user.schoolId)));
      if (cat) categoryNames[cat.id] = cat.name;
    }
  }

  res.json(
    logs.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      categoryId: l.categoryId,
      type: l.type,
      points: l.points,
      note: l.note,
      loggedById: l.loggedById,
      createdAt: l.createdAt.toISOString(),
      categoryName: l.categoryId ? (categoryNames[l.categoryId] ?? null) : null,
    }))
  );
});

router.post("/behavior/logs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBehaviorLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [studentOwned] = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(and(eq(studentsTable.id, parsed.data.studentId), eq(studentsTable.schoolId, user.schoolId)));

  if (!studentOwned) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (parsed.data.categoryId != null) {
    const [categoryOwned] = await db
      .select({ id: behaviorCategoriesTable.id })
      .from(behaviorCategoriesTable)
      .where(and(eq(behaviorCategoriesTable.id, parsed.data.categoryId), eq(behaviorCategoriesTable.schoolId, user.schoolId)));

    if (!categoryOwned) {
      res.status(404).json({ error: "Behavior category not found" });
      return;
    }
  }

  const [log] = await db
    .insert(behaviorLogsTable)
    .values({
      schoolId: user.schoolId,
      studentId: parsed.data.studentId,
      categoryId: parsed.data.categoryId ?? null,
      type: parsed.data.type,
      points: parsed.data.points,
      note: parsed.data.note ?? null,
    })
    .returning();

  res.status(201).json({
    id: log.id,
    studentId: log.studentId,
    categoryId: log.categoryId,
    type: log.type,
    points: log.points,
    note: log.note,
    loggedById: log.loggedById,
    createdAt: log.createdAt.toISOString(),
    categoryName: null,
  });
});

router.patch("/behavior/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid log ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const parsed = UpdateBehaviorLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(behaviorLogsTable)
    .where(and(eq(behaviorLogsTable.id, id), eq(behaviorLogsTable.schoolId, user.schoolId)));

  if (!existing) {
    res.status(404).json({ error: "Behavior log not found" });
    return;
  }

  const updates: Partial<typeof behaviorLogsTable.$inferInsert> = {};
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId;
  if (parsed.data.points !== undefined) updates.points = parsed.data.points;
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  const [updated] = await db
    .update(behaviorLogsTable)
    .set(updates)
    .where(and(eq(behaviorLogsTable.id, id), eq(behaviorLogsTable.schoolId, user.schoolId)))
    .returning();

  res.json({
    id: updated.id,
    studentId: updated.studentId,
    categoryId: updated.categoryId,
    type: updated.type,
    points: updated.points,
    note: updated.note,
    loggedById: updated.loggedById,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/behavior/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid log ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [existing] = await db
    .select()
    .from(behaviorLogsTable)
    .where(and(eq(behaviorLogsTable.id, id), eq(behaviorLogsTable.schoolId, user.schoolId)));

  if (!existing) {
    res.status(404).json({ error: "Behavior log not found" });
    return;
  }

  await db.delete(behaviorLogsTable).where(and(eq(behaviorLogsTable.id, id), eq(behaviorLogsTable.schoolId, user.schoolId)));
  res.status(204).send();
});

export default router;
