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
import { getCorsOrigins, getPort } from "./config";

// CORS Configuration from validated environment variables
const CORS_ORIGINS = getCorsOrigins();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = getPort();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);

// Admin Authentication Middleware
const adminAuth = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || !verifyAdmin(token)) {
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
    console.error("Error registering vote:", error);
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
    console.error("Error fetching leaderboard:", error);
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
    console.error("Error fetching recent reports:", error);
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
    console.error("Error fetching player details:", error);
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
    console.error("Error searching players:", error);
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
  if (verifyAdmin(key)) {
    res.json({ success: true, token: key });
  } else {
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
      deletePlayerReports(decodeURIComponent(playerName));
      res.json({ success: true, message: "Player reports deleted" });
    } catch (error) {
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
      res.json({ success: true, message: "Report deleted" });
    } catch (error) {
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
    revokeBan(decodeURIComponent(ip));
    res.json({ success: true, message: "Ban revoked" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Start server
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Arc Riders voting API running on http://localhost:${PORT}`);
  console.log(`📊 Leaderboard: http://localhost:${PORT}/api/leaderboard`);
  console.log(`🗳️  Vote endpoint: POST http://localhost:${PORT}/api/vote`);
  console.log(`🕵️  Admin endpoint: http://localhost:${PORT}/api/admin`);
});
