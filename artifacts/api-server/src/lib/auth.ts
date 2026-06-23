import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required but was not set.");
}
const JWT_SECRET: string = process.env.SESSION_SECRET;

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  schoolId: number;
}

export function signToken(payload: JwtPayload, expiresIn: string | number = "24h"): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: expiresIn as any }) as string;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as Request & { user: JwtPayload }).user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as Request & { user: JwtPayload }).user;
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
