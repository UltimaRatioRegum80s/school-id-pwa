import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eq } from "drizzle-orm";
import { db, schoolSettingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";
import { updateSchoolName } from "../lib/school-helpers";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  let [settings] = await db
    .select()
    .from(schoolSettingsTable)
    .where(eq(schoolSettingsTable.schoolId, user.schoolId));

  if (!settings) {
    [settings] = await db
      .insert(schoolSettingsTable)
      .values({
        schoolId: user.schoolId,
        schoolName: "My School",
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

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;

  let [settings] = await db
    .select()
    .from(schoolSettingsTable)
    .where(eq(schoolSettingsTable.schoolId, user.schoolId));

  if (!settings) {
    [settings] = await db
      .insert(schoolSettingsTable)
      .values({
        schoolId: user.schoolId,
        schoolName: "My School",
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
    .where(eq(schoolSettingsTable.schoolId, user.schoolId))
    .returning();

  if (parsed.data.schoolName) {
    await updateSchoolName(user.schoolId, parsed.data.schoolName);
  }

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
