import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq, desc } from "drizzle-orm";
import { db, behaviorLogsTable, behaviorCategoriesTable } from "@workspace/db";
import { CreateBehaviorLogBody, CreateBehaviorCategoryBody } from "@workspace/api-zod";
import { z } from "zod";

const UpdateBehaviorLogBody = z.object({
  type: z.enum(["merit", "demerit"]).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  points: z.number().int().optional(),
  note: z.string().nullable().optional(),
});

const router: IRouter = Router();

router.get("/behavior/categories", requireAuth, async (_req, res): Promise<void> => {
  const categories = await db.select().from(behaviorCategoriesTable);
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

  const [category] = await db
    .insert(behaviorCategoriesTable)
    .values(parsed.data)
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

  let logs;
  if (studentId) {
    const sid = parseInt(studentId, 10);
    logs = await db
      .select()
      .from(behaviorLogsTable)
      .where(eq(behaviorLogsTable.studentId, sid))
      .orderBy(desc(behaviorLogsTable.createdAt))
      .limit(lim);
  } else {
    logs = await db
      .select()
      .from(behaviorLogsTable)
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
        .where(eq(behaviorCategoriesTable.id, cid));
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

  const [log] = await db
    .insert(behaviorLogsTable)
    .values({
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid log ID" });
    return;
  }

  const parsed = UpdateBehaviorLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(behaviorLogsTable)
    .where(eq(behaviorLogsTable.id, id));

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
    .where(eq(behaviorLogsTable.id, id))
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid log ID" });
    return;
  }

  const [existing] = await db
    .select()
    .from(behaviorLogsTable)
    .where(eq(behaviorLogsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Behavior log not found" });
    return;
  }

  await db.delete(behaviorLogsTable).where(eq(behaviorLogsTable.id, id));
  res.status(204).send();
});

export default router;
