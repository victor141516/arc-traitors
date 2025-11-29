import { Database } from "bun:sqlite";
import { getDatabasePath } from "./config";
import { mkdirSync } from "fs";
import { dirname } from "path";

// Get database path from config
const dbPath = getDatabasePath();

// Ensure the directory exists
mkdirSync(dirname(dbPath), { recursive: true });

// Initialize SQLite database
const db = new Database(dbPath, { create: true });

// Create votes table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    player_name_normalized TEXT,
    message TEXT,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Helper function to normalize strings for search (remove accents, lowercase)
function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Migration: Add columns if they don't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(votes)").all() as any[];

  const hasMessageColumn = tableInfo.some((col) => col.name === "message");
  if (!hasMessageColumn) {
    db.run("ALTER TABLE votes ADD COLUMN message TEXT");
  }

  const hasNormalizedColumn = tableInfo.some(
    (col) => col.name === "player_name_normalized"
  );
  if (!hasNormalizedColumn) {
    console.log("[DB] Migrating: Adding player_name_normalized column...");
    db.run("ALTER TABLE votes ADD COLUMN player_name_normalized TEXT");

    // Backfill existing data
    const votes = db.prepare("SELECT id, player_name FROM votes").all() as {
      id: number;
      player_name: string;
    }[];
    const updateStmt = db.prepare(
      "UPDATE votes SET player_name_normalized = ? WHERE id = ?"
    );

    db.transaction(() => {
      for (const vote of votes) {
        updateStmt.run(normalizeString(vote.player_name), vote.id);
      }
    })();
    console.log("[DB] Migration: Normalized names backfilled.");
  }
} catch (error) {
  console.error("[DB] Error checking/adding columns:", error);
}

// Create index on player_name for better query performance
db.run(`
  CREATE INDEX IF NOT EXISTS idx_player_name ON votes(player_name)
`);

// Create index on player_name_normalized for search performance
db.run(`
  CREATE INDEX IF NOT EXISTS idx_player_name_normalized ON votes(player_name_normalized)
`);

// Create bans table
db.run(`
  CREATE TABLE IF NOT EXISTS bans (
    ip TEXT PRIMARY KEY,
    banned_until DATETIME NOT NULL
  )
`);

export interface Vote {
  id: number;
  player_name: string;
  message?: string;
  voted_at: string;
}

export interface LeaderboardEntry {
  playerName: string;
  votes: number;
  rank: number;
}

export interface RecentReport {
  id: number;
  playerName: string;
  message?: string;
  votedAt: string;
}

export interface PlayerDetails {
  playerName: string;
  totalVotes: number;
  rank: number | null;
  reports: RecentReport[];
}

/**
 * Register a vote for a player
 */
export function registerVote(
  playerName: string,
  message?: string
): { totalVotes: number } {
  try {
    const normalizedName = normalizeString(playerName);
    const stmt = db.prepare(
      "INSERT INTO votes (player_name, player_name_normalized, message) VALUES (?, ?, ?)"
    );
    stmt.run(playerName, normalizedName, message || null);

    // Get total votes for this player
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM votes WHERE player_name = ?"
    );
    const result = countStmt.get(playerName) as { count: number };

    return { totalVotes: result.count };
  } catch (error) {
    console.error(`[DB] Error registering vote for "${playerName}":`, error);
    throw error;
  }
}

/**
 * Get top 20 players with most votes (Hall of Traitors)
 */
export function getLeaderboard(): LeaderboardEntry[] {
  const stmt = db.prepare(`
    SELECT player_name, COUNT(*) as votes
    FROM votes
    GROUP BY player_name
    ORDER BY votes DESC
    LIMIT 20
  `);

  const results = stmt.all() as Array<{ player_name: string; votes: number }>;

  // Add rank to each entry
  return results.map((entry, index) => ({
    playerName: entry.player_name,
    votes: entry.votes,
    rank: index + 1,
  }));
}

/**
 * Get recent reports
 */
export function getRecentReports(limit: number = 50): RecentReport[] {
  const stmt = db.prepare(`
    SELECT id, player_name, message, voted_at
    FROM votes
    ORDER BY voted_at DESC
    LIMIT ?
  `);

  const results = stmt.all(limit) as Array<{
    id: number;
    player_name: string;
    message?: string;
    voted_at: string;
  }>;

  return results.map((entry) => ({
    id: entry.id,
    playerName: entry.player_name,
    message: entry.message,
    votedAt: entry.voted_at,
  }));
}

/**
 * Get total votes for a specific player
 */
export function getPlayerVotes(playerName: string): number {
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM votes WHERE player_name = ?"
  );
  const result = stmt.get(playerName) as { count: number };
  return result.count;
}

/**
 * Get player details and report history
 */
export function getPlayerDetails(playerName: string): PlayerDetails | null {
  // Get total votes
  const countStmt = db.prepare(
    "SELECT COUNT(*) as count FROM votes WHERE player_name = ?"
  );
  const countResult = countStmt.get(playerName) as { count: number };

  if (countResult.count === 0) {
    return null;
  }

  // Get rank
  const rankStmt = db.prepare(`
    SELECT player_name, COUNT(*) as votes
    FROM votes
    GROUP BY player_name
    ORDER BY votes DESC
  `);
  const allPlayers = rankStmt.all() as Array<{
    player_name: string;
    votes: number;
  }>;
  const rankIndex = allPlayers.findIndex((p) => p.player_name === playerName);
  const rank = rankIndex !== -1 ? rankIndex + 1 : null;

  // Get reports history
  const reportsStmt = db.prepare(`
    SELECT id, player_name, message, voted_at
    FROM votes
    WHERE player_name = ?
    ORDER BY voted_at DESC
  `);
  const reports = reportsStmt.all(playerName) as Array<{
    id: number;
    player_name: string;
    message?: string;
    voted_at: string;
  }>;

  return {
    playerName,
    totalVotes: countResult.count,
    rank,
    reports: reports.map((r) => ({
      id: r.id,
      playerName: r.player_name,
      message: r.message,
      votedAt: r.voted_at,
    })),
  };
}

/**
 * Check if an IP is banned
 */
export function isBanned(ip: string): boolean {
  const stmt = db.prepare("SELECT banned_until FROM bans WHERE ip = ?");
  const result = stmt.get(ip) as { banned_until: string } | undefined;

  if (!result) return false;

  const bannedUntil = new Date(result.banned_until);
  if (bannedUntil > new Date()) {
    return true;
  }

  // Ban expired, remove it
  db.prepare("DELETE FROM bans WHERE ip = ?").run(ip);
  return false;
}

/**
 * Ban an IP for a specific duration (in hours)
 */
export function banIp(ip: string, durationHours: number) {
  try {
    const bannedUntil = new Date();
    bannedUntil.setHours(bannedUntil.getHours() + durationHours);

    const stmt = db.prepare(
      "INSERT OR REPLACE INTO bans (ip, banned_until) VALUES (?, ?)"
    );
    stmt.run(ip, bannedUntil.toISOString());
  } catch (error) {
    console.error(`[DB] Error banning IP ${ip}:`, error);
    throw error;
  }
}

/**
 * Search for players by name prefix (accent insensitive)
 */
export function searchPlayers(
  query: string
): Array<{ playerName: string; votes: number }> {
  const normalizedQuery = normalizeString(query);

  // Use the normalized column for efficient searching
  // We group by the original player_name to show the correct display name
  const stmt = db.prepare(`
    SELECT player_name, COUNT(*) as votes
    FROM votes
    WHERE player_name_normalized LIKE ?
    GROUP BY player_name
    ORDER BY votes DESC
    LIMIT 10
  `);

  const results = stmt.all(`%${normalizedQuery}%`) as Array<{
    player_name: string;
    votes: number;
  }>;

  return results.map((entry) => ({
    playerName: entry.player_name,
    votes: entry.votes,
  }));
}

export default db;
