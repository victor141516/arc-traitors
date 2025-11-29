import db from "./db";
import { getAdminPassword } from "./config";

/**
 * Verify admin credentials
 */
export function verifyAdmin(key: string): boolean {
  return key === getAdminPassword();
}

/**
 * Get all reports for moderation (paginated)
 */
export function getAdminReports(limit: number = 100, offset: number = 0) {
  const stmt = db.prepare(`
    SELECT id, player_name, message, voted_at, player_name_normalized
    FROM votes
    ORDER BY voted_at DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(limit, offset);
}

/**
 * Delete a specific report
 */
export function deleteReport(id: number) {
  try {
    const stmt = db.prepare("DELETE FROM votes WHERE id = ?");
    return stmt.run(id);
  } catch (error) {
    console.error(`[DB] Error deleting report ${id}:`, error);
    throw error;
  }
}

/**
 * Delete all reports for a specific player
 */
export function deletePlayerReports(playerName: string) {
  try {
    const stmt = db.prepare("DELETE FROM votes WHERE player_name = ?");
    const result = stmt.run(playerName);
    return result;
  } catch (error) {
    console.error(
      `[DB] Error deleting reports for player "${playerName}":`,
      error
    );
    throw error;
  }
}

/**
 * Search reports for admin moderation
 */
export function searchAdminReports(query: string) {
  const stmt = db.prepare(`
    SELECT id, player_name, message, voted_at, player_name_normalized
    FROM votes
    WHERE player_name LIKE ? OR message LIKE ?
    ORDER BY voted_at DESC
    LIMIT 50
  `);
  const searchPattern = `%${query}%`;
  return stmt.all(searchPattern, searchPattern);
}

/**
 * Get all active bans
 */
export function getBans() {
  const stmt = db.prepare(
    "SELECT ip, banned_until FROM bans ORDER BY banned_until DESC"
  );
  return stmt.all();
}

/**
 * Revoke a ban
 */
export function revokeBan(ip: string) {
  try {
    const stmt = db.prepare("DELETE FROM bans WHERE ip = ?");
    return stmt.run(ip);
  } catch (error) {
    console.error(`[DB] Error revoking ban for IP ${ip}:`, error);
    throw error;
  }
}
