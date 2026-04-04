import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, schoolSettingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(schoolSettingsTable).limit(1);

  if (!settings) {
    [settings] = await db
      .insert(schoolSettingsTable)
      .values({
        schoolName: "Springfield Academy",
        startTime: "07:30",
        endTime: "14:30",
        lateThresholdMinutes: "15",
        timezone: "Africa/Johannesburg",
      })
      .returning();
  }

  res.json({
    id: settings.id,
    schoolName: settings.schoolName,
    startTime: settings.startTime,
    endTime: settings.endTime,
    lateThresholdMinutes: settings.lateThresholdMinutes,
    timezone: settings.timezone,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [settings] = await db.select().from(schoolSettingsTable).limit(1);

  if (!settings) {
    [settings] = await db
      .insert(schoolSettingsTable)
      .values({
        schoolName: "Springfield Academy",
        startTime: "07:30",
        endTime: "14:30",
        lateThresholdMinutes: "15",
        timezone: "Africa/Johannesburg",
      })
      .returning();
  }

  const [updated] = await db
    .update(schoolSettingsTable)
    .set(parsed.data)
    .where(eq(schoolSettingsTable.id, settings.id))
    .returning();

  res.json({
    id: updated.id,
    schoolName: updated.schoolName,
    startTime: updated.startTime,
    endTime: updated.endTime,
    lateThresholdMinutes: updated.lateThresholdMinutes,
    timezone: updated.timezone,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
