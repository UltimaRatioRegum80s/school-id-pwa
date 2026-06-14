import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { db, behaviorLogsTable, behaviorCategoriesTable, studentsTable, recognitionTiersTable, recognitionAwardsTable, usersTable } from "@workspace/db";
import { CreateBehaviorLogBody, CreateBehaviorCategoryBody, UpdateBehaviorLogBody, CreateRecognitionTierBody, UpdateRecognitionTierBody, AwardRecognitionBody } from "@workspace/api-zod";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

function formatTier(t: typeof recognitionTiersTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    thresholdPoints: t.thresholdPoints,
    description: t.description,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
  };
}

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

router.get("/behavior/recognition-tiers", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const tiers = await db
    .select()
    .from(recognitionTiersTable)
    .where(eq(recognitionTiersTable.schoolId, user.schoolId))
    .orderBy(asc(recognitionTiersTable.sortOrder), asc(recognitionTiersTable.thresholdPoints));
  res.json(tiers.map(formatTier));
});

router.post("/behavior/recognition-tiers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRecognitionTierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [tier] = await db
    .insert(recognitionTiersTable)
    .values({
      schoolId: user.schoolId,
      name: parsed.data.name,
      thresholdPoints: parsed.data.thresholdPoints,
      description: parsed.data.description ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(formatTier(tier));
});

router.patch("/behavior/recognition-tiers/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid tier ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const parsed = UpdateRecognitionTierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(recognitionTiersTable)
    .where(and(eq(recognitionTiersTable.id, id), eq(recognitionTiersTable.schoolId, user.schoolId)));

  if (!existing) {
    res.status(404).json({ error: "Recognition tier not found" });
    return;
  }

  const updates: Partial<typeof recognitionTiersTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.thresholdPoints !== undefined) updates.thresholdPoints = parsed.data.thresholdPoints;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

  const [updated] = await db
    .update(recognitionTiersTable)
    .set(updates)
    .where(and(eq(recognitionTiersTable.id, id), eq(recognitionTiersTable.schoolId, user.schoolId)))
    .returning();

  res.json(formatTier(updated));
});

router.delete("/behavior/recognition-tiers/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid tier ID" });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  const [existing] = await db
    .select()
    .from(recognitionTiersTable)
    .where(and(eq(recognitionTiersTable.id, id), eq(recognitionTiersTable.schoolId, user.schoolId)));

  if (!existing) {
    res.status(404).json({ error: "Recognition tier not found" });
    return;
  }

  await db.delete(recognitionTiersTable).where(and(eq(recognitionTiersTable.id, id), eq(recognitionTiersTable.schoolId, user.schoolId)));
  res.status(204).send();
});

router.get("/behavior/recognition", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;

  const tiers = await db
    .select()
    .from(recognitionTiersTable)
    .where(eq(recognitionTiersTable.schoolId, user.schoolId))
    .orderBy(asc(recognitionTiersTable.sortOrder), asc(recognitionTiersTable.thresholdPoints));

  if (tiers.length === 0) {
    res.json([]);
    return;
  }

  const meritTotals = await db
    .select({
      studentId: behaviorLogsTable.studentId,
      total: sql<number>`COALESCE(SUM(${behaviorLogsTable.points}), 0)`,
    })
    .from(behaviorLogsTable)
    .where(and(eq(behaviorLogsTable.schoolId, user.schoolId), eq(behaviorLogsTable.type, "merit")))
    .groupBy(behaviorLogsTable.studentId);

  const minThreshold = Math.min(...tiers.map((t) => t.thresholdPoints));
  const qualifyingTotals = meritTotals.filter((m) => Number(m.total) >= minThreshold);

  if (qualifyingTotals.length === 0) {
    res.json([]);
    return;
  }

  const students = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.schoolId, user.schoolId), eq(studentsTable.isActive, 1)));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const awards = await db
    .select({
      id: recognitionAwardsTable.id,
      studentId: recognitionAwardsTable.studentId,
      tierId: recognitionAwardsTable.tierId,
      awardedAt: recognitionAwardsTable.awardedAt,
      awardedByFirstName: usersTable.firstName,
      awardedByLastName: usersTable.lastName,
    })
    .from(recognitionAwardsTable)
    .leftJoin(usersTable, eq(recognitionAwardsTable.awardedById, usersTable.id))
    .where(eq(recognitionAwardsTable.schoolId, user.schoolId));

  const awardMap = new Map<string, (typeof awards)[number]>();
  for (const a of awards) {
    awardMap.set(`${a.studentId}:${a.tierId}`, a);
  }

  const qualifiers = qualifyingTotals
    .map((m) => {
      const student = studentMap.get(m.studentId);
      if (!student) return null;
      const total = Number(m.total);
      const earned = tiers.filter((t) => total >= t.thresholdPoints);
      if (earned.length === 0) return null;
      const highest = earned.reduce((a, b) => (b.thresholdPoints > a.thresholdPoints ? b : a));
      const earnedTiers = earned.map((t) => {
        const award = awardMap.get(`${student.id}:${t.id}`);
        return {
          ...formatTier(t),
          actioned: !!award,
          awardId: award ? award.id : null,
          awardedAt: award ? award.awardedAt.toISOString() : null,
          awardedByName: award && award.awardedByFirstName
            ? `${award.awardedByFirstName} ${award.awardedByLastName}`
            : null,
        };
      });
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentCode: student.studentId,
        grade: student.grade,
        className: student.className,
        totalMerits: total,
        highestTier: formatTier(highest),
        earnedTiers,
        pendingCount: earnedTiers.filter((t) => !t.actioned).length,
        actionedCount: earnedTiers.filter((t) => t.actioned).length,
      };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null)
    .sort((a, b) => {
      if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
      return b.totalMerits - a.totalMerits;
    });

  res.json(qualifiers);
});

router.post("/behavior/recognition/award", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const parsed = AwardRecognitionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { studentId, tierId } = parsed.data;

  const [tier] = await db
    .select()
    .from(recognitionTiersTable)
    .where(and(eq(recognitionTiersTable.id, tierId), eq(recognitionTiersTable.schoolId, user.schoolId)));
  if (!tier) {
    res.status(404).json({ error: "Recognition tier not found" });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, user.schoolId)));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(recognitionAwardsTable)
    .where(and(eq(recognitionAwardsTable.studentId, studentId), eq(recognitionAwardsTable.tierId, tierId)));

  if (existing) {
    res.json({
      id: existing.id,
      studentId: existing.studentId,
      tierId: existing.tierId,
      awardedById: existing.awardedById,
      awardedAt: existing.awardedAt.toISOString(),
    });
    return;
  }

  const [created] = await db
    .insert(recognitionAwardsTable)
    .values({
      schoolId: user.schoolId,
      studentId,
      tierId,
      awardedById: user.userId,
    })
    .returning();

  res.json({
    id: created.id,
    studentId: created.studentId,
    tierId: created.tierId,
    awardedById: created.awardedById,
    awardedAt: created.awardedAt.toISOString(),
  });
});

router.delete("/behavior/recognition/award/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(recognitionAwardsTable)
    .where(and(eq(recognitionAwardsTable.id, id), eq(recognitionAwardsTable.schoolId, user.schoolId)));
  if (!existing) {
    res.status(404).json({ error: "Award not found" });
    return;
  }

  await db.delete(recognitionAwardsTable).where(and(eq(recognitionAwardsTable.id, id), eq(recognitionAwardsTable.schoolId, user.schoolId)));
  res.status(204).end();
});

export default router;
