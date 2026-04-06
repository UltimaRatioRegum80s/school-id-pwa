import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";
import { verifyToken } from "./auth";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
    : ["http://localhost:21283", "http://localhost:80"];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket.io",
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as Record<string, string>).token ||
      (socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice(7)
        : null);

    if (!token) {
      next(new Error("Authentication token required"));
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      next(new Error("Invalid or expired token"));
      return;
    }

    (socket as typeof socket & { user: typeof payload }).user = payload;
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket as typeof socket & { user: ReturnType<typeof verifyToken> }).user;
    if (user && user.schoolId) {
      const room = `school:${user.schoolId}`;
      socket.join(room);
      logger.info({ socketId: socket.id, room }, "Socket connected and joined school room");
    } else {
      logger.info({ socketId: socket.id }, "Socket connected");
    }

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function broadcastStateChange(data: {
  type: string;
  studentId: number;
  studentName: string;
  newState: string;
  scanType: string;
  message: string;
  schoolId: number;
}): void {
  if (io) {
    const { schoolId, ...payload } = data;
    io.to(`school:${schoolId}`).emit("state_changed", payload);
  }
}

export function broadcastDashboardUpdate(schoolId: number): void {
  if (io) {
    io.to(`school:${schoolId}`).emit("dashboard_update", { timestamp: new Date().toISOString() });
  }
}
