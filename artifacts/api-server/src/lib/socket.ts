import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");
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
}): void {
  if (io) {
    io.emit("state_changed", data);
  }
}

export function broadcastDashboardUpdate(): void {
  if (io) {
    io.emit("dashboard_update", { timestamp: new Date().toISOString() });
  }
}
