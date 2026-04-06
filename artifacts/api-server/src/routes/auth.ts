import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, usersTable, schoolsTable } from "@workspace/db";
import { LoginBody, CreateUserBody } from "@workspace/api-zod";
import { signToken, requireAuth, requireAdmin } from "../lib/auth";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const RegisterSchoolBody = z.object({
  schoolName: z.string().min(1),
  schoolSlug: z.string().min(1),
  schoolCode: z.string().min(1).toUpperCase(),
  adminUsername: z.string().min(1),
  adminPassword: z.string().min(6),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  contactEmail: z.string().email().optional(),
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role, schoolId: user.schoolId });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      schoolId: user.schoolId,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.userId));

  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: dbUser.id,
    username: dbUser.username,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.role,
    isActive: dbUser.isActive,
    schoolId: dbUser.schoolId,
    createdAt: dbUser.createdAt.toISOString(),
  });
});

router.post("/auth/register-school", async (req, res): Promise<void> => {
  const parsed = RegisterSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { schoolName, schoolSlug, schoolCode, adminUsername, adminPassword, adminFirstName, adminLastName, contactEmail } = parsed.data;

  const [existingSlug] = await db
    .select({ id: schoolsTable.id })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, schoolSlug));

  if (existingSlug) {
    res.status(409).json({ error: "A school with this slug already exists" });
    return;
  }

  const [existingCode] = await db
    .select({ id: schoolsTable.id })
    .from(schoolsTable)
    .where(eq(schoolsTable.code, schoolCode.toUpperCase()));

  if (existingCode) {
    res.status(409).json({ error: "A school with this code already exists" });
    return;
  }

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, adminUsername));

  if (existingUser) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const { school, adminUser } = await db.transaction(async (tx) => {
    const [newSchool] = await tx.insert(schoolsTable).values({
      name: schoolName,
      slug: schoolSlug,
      code: schoolCode.toUpperCase(),
      contactEmail: contactEmail ?? null,
      plan: "free",
      isActive: true,
    }).returning();

    const [newAdmin] = await tx.insert(usersTable).values({
      schoolId: newSchool.id,
      username: adminUsername,
      passwordHash,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: "admin",
    }).returning();

    return { school: newSchool, adminUser: newAdmin };
  });

  const token = signToken({ userId: adminUser.id, username: adminUser.username, role: adminUser.role, schoolId: school.id });

  res.status(201).json({
    token,
    user: {
      id: adminUser.id,
      username: adminUser.username,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      role: adminUser.role,
      isActive: adminUser.isActive,
      schoolId: school.id,
      createdAt: adminUser.createdAt.toISOString(),
    },
  });
});

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.schoolId, user.schoolId));
  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      schoolId: u.schoolId,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;
  const { username, password, firstName, lastName, role } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db
    .insert(usersTable)
    .values({ schoolId: user.schoolId, username, passwordHash, firstName, lastName, role })
    .returning();

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
    isActive: newUser.isActive,
    schoolId: newUser.schoolId,
    createdAt: newUser.createdAt.toISOString(),
  });
});

export default router;
