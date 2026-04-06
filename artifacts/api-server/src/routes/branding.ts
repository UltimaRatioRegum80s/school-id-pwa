import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, schoolsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import { ObjectStorageService } from "../lib/objectStorage";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const VALID_PALETTES = [
  "navy-gold",
  "forest-green-white",
  "deep-red-silver",
  "royal-purple-gold",
  "teal-white",
  "charcoal-orange",
];

const UpdateBrandingBody = z.object({
  colorPalette: z.string().optional(),
  logoObjectPath: z.string().nullable().optional(),
});

const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number().int(),
  contentType: z.string(),
});

router.get("/school/branding", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;

  const [school] = await db
    .select({
      name: schoolsTable.name,
      logoUrl: schoolsTable.logoUrl,
      colorPalette: schoolsTable.colorPalette,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.id, user.schoolId));

  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  res.json({
    schoolName: school.name,
    logoUrl: school.logoUrl ?? null,
    colorPalette: school.colorPalette,
  });
});

router.put("/school/branding", requireAdmin, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;

  const parsed = UpdateBrandingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { colorPalette, logoObjectPath } = parsed.data;

  if (colorPalette !== undefined && !VALID_PALETTES.includes(colorPalette)) {
    res.status(400).json({
      error: `Invalid palette. Must be one of: ${VALID_PALETTES.join(", ")}`,
    });
    return;
  }

  const updates: Partial<{ colorPalette: string; logoUrl: string | null }> = {};

  if (colorPalette !== undefined) {
    updates.colorPalette = colorPalette;
  }

  if (logoObjectPath !== undefined) {
    if (logoObjectPath === null) {
      updates.logoUrl = null;
    } else {
      const servingUrl = `/api/storage${logoObjectPath}`;
      updates.logoUrl = servingUrl;
    }
  }

  if (Object.keys(updates).length === 0) {
    const [school] = await db
      .select({ name: schoolsTable.name, logoUrl: schoolsTable.logoUrl, colorPalette: schoolsTable.colorPalette })
      .from(schoolsTable)
      .where(eq(schoolsTable.id, user.schoolId));

    res.json({
      schoolName: school?.name ?? "",
      logoUrl: school?.logoUrl ?? null,
      colorPalette: school?.colorPalette ?? "navy-gold",
    });
    return;
  }

  const [updated] = await db
    .update(schoolsTable)
    .set(updates)
    .where(eq(schoolsTable.id, user.schoolId))
    .returning({
      name: schoolsTable.name,
      logoUrl: schoolsTable.logoUrl,
      colorPalette: schoolsTable.colorPalette,
    });

  if (!updated) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  res.json({
    schoolName: updated.name,
    logoUrl: updated.logoUrl ?? null,
    colorPalette: updated.colorPalette,
  });
});

router.post("/school/branding/logo", requireAdmin, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uploadURL = await storage.getObjectEntityUploadURL();
  const normalized = storage.normalizeObjectEntityPath(uploadURL);

  res.json({
    uploadURL,
    objectPath: normalized,
  });
});


export default router;
