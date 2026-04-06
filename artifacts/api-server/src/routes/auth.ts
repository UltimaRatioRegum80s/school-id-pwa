import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db, usersTable, schoolsTable, inviteTokensTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth, requireAdmin } from "../lib/auth";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth";
import { z } from "zod";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
const HMAC_SECRET: string = process.env.SESSION_SECRET;

function createSignedToken(schoolId: number): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${schoolId}:${nonce}`;
  const signature = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

function verifySignedToken(token: string): { schoolId: number; valid: boolean } {
  const parts = token.split(":");
  if (parts.length !== 3) return { schoolId: 0, valid: false };
  const [schoolIdStr, nonce, signature] = parts;
  const payload = `${schoolIdStr}:${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex");
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");
  if (sigBuffer.length !== expectedBuffer.length) return { schoolId: 0, valid: false };
  const valid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  return { schoolId: parseInt(schoolIdStr, 10), valid };
}

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

const SelfRegisterBody = z.object({
  schoolId: z.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const InviteRegisterBody = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const CreateInviteBody = z.object({
  expiresInDays: z.number().int().positive().optional(),
});

const ChangePasswordBody = z.object({
  newPassword: z.string().min(6),
});

const AdminCreateUserBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().min(1),
});

function generateUsername(firstName: string, lastName: string): string {
  const base = (firstName[0] + lastName).toLowerCase().replace(/[^a-z0-9]/g, "");
  return base;
}

function generateTempPassword(): string {
  return crypto.randomBytes(6).toString("hex");
}

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

  if (user.status === "rejected") {
    res.status(403).json({ error: "Your registration was rejected. Please contact your school administrator." });
    return;
  }

  if (user.status === "pending") {
    res.status(403).json({ error: "Your account is pending approval by the school administrator.", pending: true });
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
      mustChangePassword: user.mustChangePassword,
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
    mustChangePassword: dbUser.mustChangePassword,
    createdAt: dbUser.createdAt.toISOString(),
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const user = (req as Request & { user: JwtPayload }).user;
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await db
    .update(usersTable)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(usersTable.id, user.userId));

  res.json({ success: true });
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
      status: "active",
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
      mustChangePassword: adminUser.mustChangePassword,
      createdAt: adminUser.createdAt.toISOString(),
    },
  });
});

router.get("/schools/public", async (req, res): Promise<void> => {
  const schools = await db
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug })
    .from(schoolsTable)
    .where(eq(schoolsTable.isActive, true));
  res.json(schools);
});

router.post("/auth/self-register", async (req, res): Promise<void> => {
  const parsed = SelfRegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { schoolId, username, password, firstName, lastName } = parsed.data;

  const [school] = await db
    .select({ id: schoolsTable.id, isActive: schoolsTable.isActive })
    .from(schoolsTable)
    .where(and(eq(schoolsTable.id, schoolId), eq(schoolsTable.isActive, true)));

  if (!school) {
    res.status(404).json({ error: "School not found or inactive" });
    return;
  }

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existingUser) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db.insert(usersTable).values({
    schoolId,
    username,
    passwordHash,
    firstName,
    lastName,
    role: "staff",
    status: "pending",
    isActive: "true",
  }).returning();

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
    status: newUser.status,
    schoolId: newUser.schoolId,
    createdAt: newUser.createdAt.toISOString(),
  });
});

router.post("/auth/invite-register", async (req, res): Promise<void> => {
  const parsed = InviteRegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { token, password, firstName, lastName } = parsed.data;

  const { valid: signatureValid } = verifySignedToken(token);
  if (!signatureValid) {
    res.status(404).json({ error: "Invalid invite link" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { newUser, conflict } = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(inviteTokensTable)
      .where(and(eq(inviteTokensTable.token, token), isNull(inviteTokensTable.usedAt)));

    if (!invite) {
      return { newUser: null, conflict: "used_or_invalid" as const };
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return { newUser: null, conflict: "expired" as const };
    }

    const [marked] = await tx
      .update(inviteTokensTable)
      .set({ usedAt: new Date() })
      .where(and(eq(inviteTokensTable.id, invite.id), isNull(inviteTokensTable.usedAt)))
      .returning();

    if (!marked) {
      return { newUser: null, conflict: "used_or_invalid" as const };
    }

    const baseUsername = generateUsername(firstName, lastName);
    let username = baseUsername;
    let suffix = 1;
    while (true) {
      const [existing] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, username));
      if (!existing) break;
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    const [user] = await tx.insert(usersTable).values({
      schoolId: invite.schoolId,
      username,
      passwordHash,
      firstName,
      lastName,
      role: "staff",
      status: "active",
      isActive: "true",
    }).returning();

    return { newUser: user, conflict: null };
  });

  if (conflict === "expired") {
    res.status(410).json({ error: "This invite link has expired" });
    return;
  }

  if (!newUser) {
    res.status(409).json({ error: "This invite link has already been used" });
    return;
  }

  const jwtToken = signToken({ userId: newUser.id, username: newUser.username, role: newUser.role, schoolId: newUser.schoolId });

  res.status(201).json({
    token: jwtToken,
    user: {
      id: newUser.id,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      isActive: newUser.isActive,
      schoolId: newUser.schoolId,
      mustChangePassword: newUser.mustChangePassword,
      createdAt: newUser.createdAt.toISOString(),
    },
  });
});

router.get("/invites/:token/validate", async (req, res): Promise<void> => {
  const { token } = req.params;

  const { valid: signatureValid } = verifySignedToken(token);
  if (!signatureValid) {
    res.status(404).json({ error: "Invalid invite link" });
    return;
  }

  const [invite] = await db
    .select()
    .from(inviteTokensTable)
    .where(eq(inviteTokensTable.token, token));

  if (!invite) {
    res.status(404).json({ error: "Invalid invite link" });
    return;
  }

  if (invite.usedAt) {
    res.status(409).json({ error: "This invite link has already been used" });
    return;
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(410).json({ error: "This invite link has expired" });
    return;
  }

  const [school] = await db
    .select({ id: schoolsTable.id, name: schoolsTable.name })
    .from(schoolsTable)
    .where(eq(schoolsTable.id, invite.schoolId));

  res.json({
    valid: true,
    schoolId: invite.schoolId,
    schoolName: school?.name ?? "Unknown School",
    expiresAt: invite.expiresAt?.toISOString() ?? null,
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
      status: u.status,
      schoolId: u.schoolId,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as Request & { user: JwtPayload }).user;
  const { firstName, lastName, role } = parsed.data;

  const baseUsername = generateUsername(firstName, lastName);

  let username = baseUsername;
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (!existing) break;
    username = `${baseUsername}${suffix}`;
    suffix++;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const [newUser] = await db
    .insert(usersTable)
    .values({
      schoolId: user.schoolId,
      username,
      passwordHash,
      firstName,
      lastName,
      role,
      status: "active",
      mustChangePassword: true,
    })
    .returning();

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    tempPassword,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
    isActive: newUser.isActive,
    status: newUser.status,
    schoolId: newUser.schoolId,
    mustChangePassword: newUser.mustChangePassword,
    createdAt: newUser.createdAt.toISOString(),
  });
});

router.patch("/users/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const adminUser = (req as Request & { user: JwtPayload }).user;
  const userId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!["active", "pending", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [targetUser] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, adminUser.schoolId)));

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ status })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    id: updated.id,
    username: updated.username,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
    isActive: updated.isActive,
    status: updated.status,
    schoolId: updated.schoolId,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/invites", requireAdmin, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const now = new Date();

  const invites = await db
    .select()
    .from(inviteTokensTable)
    .where(
      and(
        eq(inviteTokensTable.schoolId, user.schoolId),
        isNull(inviteTokensTable.usedAt)
      )
    );

  const active = invites.filter((i) => !i.expiresAt || i.expiresAt > now);

  res.json(
    active.map((i) => ({
      id: i.id,
      token: i.token,
      expiresAt: i.expiresAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    }))
  );
});

router.post("/invites", requireAdmin, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const parsed = CreateInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const token = createSignedToken(user.schoolId);
  let expiresAt: Date | null = null;
  if (parsed.data.expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);
  }

  const [invite] = await db
    .insert(inviteTokensTable)
    .values({
      schoolId: user.schoolId,
      token,
      expiresAt,
      createdBy: user.userId,
    })
    .returning();

  res.status(201).json({
    id: invite.id,
    token: invite.token,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  });
});

router.delete("/invites/:id", requireAdmin, async (req, res): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const inviteId = parseInt(req.params.id, 10);

  const [invite] = await db
    .select()
    .from(inviteTokensTable)
    .where(and(eq(inviteTokensTable.id, inviteId), eq(inviteTokensTable.schoolId, user.schoolId)));

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  await db.delete(inviteTokensTable).where(eq(inviteTokensTable.id, inviteId));

  res.json({ success: true });
});

export default router;
