import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  registerVote,
  getLeaderboard,
  searchPlayers,
  getRecentReports,
  getPlayerDetails,
  isBanned,
  banIp,
} from "./db";
import {
  verifyAdmin,
  getAdminReports,
  deleteReport,
  deletePlayerReports,
  searchAdminReports,
  getBans,
  revokeBan,
} from "./admin";
import { getCorsOrigins, getPort, getDatabasePath } from "./config";

// CORS Configuration from validated environment variables
const CORS_ORIGINS = getCorsOrigins();

const app = express();
const httpServer = createServer(app);

// Only configure Socket.io CORS if CORS_ORIGINS is defined
const io = new Server(
  httpServer,
  CORS_ORIGINS
    ? {
        cors: {
          origin: CORS_ORIGINS,
          methods: ["GET", "POST"],
          credentials: true,
        },
      }
    : {}
);

const PORT = getPort();

// Middleware
app.use(express.json());

// Only apply CORS middleware if CORS_ORIGINS is defined
if (CORS_ORIGINS) {
  app.use(
    cors({
      origin: CORS_ORIGINS,
      methods: ["GET", "POST", "DELETE"],
      credentials: true,
    })
  );
}

// Admin Authentication Middleware
const adminAuth = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(
      `[AUTH] Unauthorized admin access attempt from ${req.socket.remoteAddress}`
    );
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || !verifyAdmin(token)) {
    console.log(
      `[AUTH] Failed admin authentication from ${req.socket.remoteAddress}`
    );
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  next();
};

// Rate Limiting Logic
const RATE_LIMIT_WINDOW = 30 * 1000; // 30 seconds
const BAN_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_BAN_WINDOW = 10;
const BAN_DURATION_HOURS = 12;

interface RequestRecord {
  lastRequest: number;
  requestCount: number;
  windowStart: number;
}

const requestRecords = new Map<string, RequestRecord>();

const rateLimiter = (req: Request, res: Response, next: Function) => {
  // Get IP address
  const ip = (req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown") as string;

  // Check if IP is banned in DB
  if (isBanned(ip)) {
    console.log(`[SECURITY] Banned IP attempted to vote: ${ip}`);
    return res.status(403).json({
      success: false,
      error:
        "You are banned from voting for 12 hours due to excessive activity.",
    });
  }

  const now = Date.now();
  let record = requestRecords.get(ip);

  if (!record) {
    record = {
      lastRequest: 0,
      requestCount: 0,
      windowStart: now,
    };
    requestRecords.set(ip, record);
  }

  // 1. Rate Limit: 1 request every 30 seconds
  if (now - record.lastRequest < RATE_LIMIT_WINDOW) {
    const remainingTime = Math.ceil(
      (RATE_LIMIT_WINDOW - (now - record.lastRequest)) / 1000
    );
    console.log(
      `[RATE_LIMIT] IP ${ip} hit rate limit, ${remainingTime}s remaining`
    );
    return res.status(429).json({
      success: false,
      error: `Please wait ${remainingTime} seconds before voting again.`,
    });
  }

  // 2. Ban Logic: > 10 requests in 5 minutes
  // Reset window if 5 minutes have passed
  if (now - record.windowStart > BAN_WINDOW) {
    record.requestCount = 0;
    record.windowStart = now;
  }

  record.requestCount++;
  record.lastRequest = now;

  if (record.requestCount > MAX_REQUESTS_PER_BAN_WINDOW) {
    console.log(
      `[SECURITY] IP banned for excessive requests: ${ip} (${record.requestCount} requests in 5 min)`
    );
    banIp(ip, BAN_DURATION_HOURS);
    requestRecords.delete(ip); // Clear memory record as DB handles ban now
    return res.status(403).json({
      success: false,
      error: "You have been banned for 12 hours due to suspicious activity.",
    });
  }

  next();
};

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// POST /api/vote - Register a vote for a player
app.post("/api/vote", rateLimiter, (req: Request, res: Response) => {
  try {
    const { playerName, message } = req.body;

    if (!playerName || typeof playerName !== "string") {
      return res.status(400).json({
        success: false,
        error: "Player name is required",
      });
    }

    const trimmedName = playerName.trim();
    if (trimmedName.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Player name cannot be empty",
      });
    }

    let trimmedMessage: string | undefined = undefined;
    if (message && typeof message === "string") {
      trimmedMessage = message.trim();
      if (trimmedMessage.length > 1000) {
        trimmedMessage = trimmedMessage.substring(0, 1000);
      }
    }

    const { totalVotes } = registerVote(trimmedName, trimmedMessage);

    console.log(
      `[VOTE] New vote registered for "${trimmedName}" (total: ${totalVotes})`
    );

    // Emit new vote event to all connected clients
    io.emit("new_vote", {
      playerName: trimmedName,
      message: trimmedMessage,
      totalVotes,
      votedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Vote registered",
      playerName: trimmedName,
      totalVotes,
    });
  } catch (error) {
    console.error("[ERROR] Failed to register vote:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// GET /api/leaderboard - Get top 20 players with most votes
app.get("/api/leaderboard", (req: Request, res: Response) => {
  try {
    const leaderboard = getLeaderboard();

    res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch leaderboard:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// GET /api/recent - Get recent reports
app.get("/api/recent", (req: Request, res: Response) => {
  try {
    const recentReports = getRecentReports();

    res.json({
      success: true,
      recentReports,
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch recent reports:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// GET /api/player/:playerName - Get player details
app.get("/api/player/:playerName", (req: Request, res: Response) => {
  try {
    const { playerName } = req.params;
    if (!playerName) {
      return res.status(400).json({
        success: false,
        error: "Player name is required",
      });
    }

    const player = getPlayerDetails(playerName);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    res.json({
      success: true,
      player,
    });
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch player details for "${req.params.playerName}":`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// GET /api/search - Search players by name prefix
app.get("/api/search", (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.json({
        success: true,
        results: [],
      });
    }

    const results = searchPlayers(q);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(
      `[ERROR] Failed to search players (query: "${req.query.q}"):`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// --- ADMIN ROUTES ---

// POST /api/admin/login - Verify admin key
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { key } = req.body;
  const ip = req.socket.remoteAddress;

  if (verifyAdmin(key)) {
    console.log(`[ADMIN] Successful admin login from ${ip}`);
    res.json({ success: true, token: key });
  } else {
    console.log(`[ADMIN] Failed admin login attempt from ${ip}`);
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

// GET /api/admin/reports - Get all reports
app.get("/api/admin/reports", adminAuth, (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    let reports;

    if (q && typeof q === "string") {
      reports = searchAdminReports(q);
    } else {
      reports = getAdminReports();
    }

    res.json({ success: true, reports });
  } catch (error) {
    console.error("[ADMIN] Error fetching reports:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/admin/player/:playerName - Delete all reports for a player
app.delete(
  "/api/admin/player/:playerName",
  adminAuth,
  (req: Request, res: Response) => {
    try {
      const { playerName } = req.params;
      if (!playerName) {
        return res
          .status(400)
          .json({ success: false, error: "Player name required" });
      }
      const decodedName = decodeURIComponent(playerName);
      deletePlayerReports(decodedName);
      console.log(`[ADMIN] Deleted all reports for player "${decodedName}"`);
      res.json({ success: true, message: "Player reports deleted" });
    } catch (error) {
      console.error(`[ADMIN] Error deleting player reports:`, error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// DELETE /api/admin/reports/:id - Delete a report
app.delete(
  "/api/admin/reports/:id",
  adminAuth,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      deleteReport(Number(id));
      console.log(`[ADMIN] Deleted report ID: ${id}`);
      res.json({ success: true, message: "Report deleted" });
    } catch (error) {
      console.error(`[ADMIN] Error deleting report ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// GET /api/admin/bans - Get active bans
app.get("/api/admin/bans", adminAuth, (req: Request, res: Response) => {
  try {
    const bans = getBans();
    res.json({ success: true, bans });
  } catch (error) {
    console.error("[ADMIN] Error fetching bans:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/admin/bans/:ip - Revoke a ban
app.delete("/api/admin/bans/:ip", adminAuth, (req: Request, res: Response) => {
  try {
    const { ip } = req.params;
    if (!ip) {
      return res.status(400).json({ success: false, error: "IP required" });
    }
    const decodedIp = decodeURIComponent(ip);
    revokeBan(decodedIp);
    console.log(`[ADMIN] Revoked ban for IP: ${decodedIp}`);
    res.json({ success: true, message: "Ban revoked" });
  } catch (error) {
    console.error(`[ADMIN] Error revoking ban:`, error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Start server
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`========================================`);
  console.log(`🚀 Arc Riders voting API running`);
  console.log(`   Port: ${PORT}`);
  console.log(`   CORS: ${CORS_ORIGINS ? "Enabled" : "Disabled"}`);
  console.log(`   Database: ${getDatabasePath()}`);
  console.log(`========================================`);
  console.log(`📊 Leaderboard: http://localhost:${PORT}/api/leaderboard`);
  console.log(`🗳️  Vote endpoint: POST http://localhost:${PORT}/api/vote`);
  console.log(`🕵️  Admin endpoint: http://localhost:${PORT}/api/admin`);
  console.log(`========================================`);
});
