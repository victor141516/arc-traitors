/**
 * Login rate limiting with exponential backoff
 * Blocks IPs after 5 failed attempts in 1 minute
 * Uses exponential backoff: 1min, 2min, 4min, 8min, etc.
 */

interface LoginAttempt {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil?: number;
  blockCount: number; // Number of times this IP has been blocked
}

const loginAttempts = new Map<string, LoginAttempt>();
const ATTEMPT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;
const BASE_BLOCK_TIME = 60 * 1000; // 1 minute base

/**
 * Calculate exponential backoff time
 */
function calculateBlockTime(blockCount: number): number {
  // Exponential backoff: 1min, 2min, 4min, 8min, 16min, max 1 hour
  const exponentialTime = BASE_BLOCK_TIME * Math.pow(2, blockCount);
  const maxBlockTime = 60 * 60 * 1000; // 1 hour max
  return Math.min(exponentialTime, maxBlockTime);
}

/**
 * Check if IP is currently blocked
 */
export function isLoginBlocked(ip: string): {
  blocked: boolean;
  remainingTime?: number;
} {
  const record = loginAttempts.get(ip);

  if (!record || !record.blockedUntil) {
    return { blocked: false };
  }

  const now = Date.now();

  if (now < record.blockedUntil) {
    const remainingTime = Math.ceil((record.blockedUntil - now) / 1000);
    return { blocked: true, remainingTime };
  }

  // Block expired, reset attempts
  record.attempts = 0;
  record.firstAttemptTime = now;
  record.blockedUntil = undefined;

  return { blocked: false };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(ip: string): {
  shouldBlock: boolean;
  blockTime?: number;
  attemptsLeft?: number;
} {
  const now = Date.now();
  let record = loginAttempts.get(ip);

  if (!record) {
    record = {
      attempts: 1,
      firstAttemptTime: now,
      blockCount: 0,
    };
    loginAttempts.set(ip, record);
    return {
      shouldBlock: false,
      attemptsLeft: MAX_ATTEMPTS - 1,
    };
  }

  // If attempt window has passed, reset
  if (now - record.firstAttemptTime > ATTEMPT_WINDOW) {
    record.attempts = 1;
    record.firstAttemptTime = now;
    return {
      shouldBlock: false,
      attemptsLeft: MAX_ATTEMPTS - 1,
    };
  }

  // Increment attempts
  record.attempts++;

  // Check if should block
  if (record.attempts > MAX_ATTEMPTS) {
    record.blockCount++;
    const blockTime = calculateBlockTime(record.blockCount - 1);
    record.blockedUntil = now + blockTime;

    console.log(
      `[LOGIN_RATE_LIMIT] IP ${ip} blocked for ${blockTime / 1000}s after ${
        record.attempts
      } failed attempts (block #${record.blockCount})`
    );

    return {
      shouldBlock: true,
      blockTime: Math.ceil(blockTime / 1000),
    };
  }

  return {
    shouldBlock: false,
    attemptsLeft: MAX_ATTEMPTS - record.attempts,
  };
}

/**
 * Reset attempts for an IP (called on successful login)
 */
export function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Clean up old records (call periodically)
 */
export function cleanupOldRecords(): void {
  const now = Date.now();
  const expiredIps: string[] = [];

  for (const [ip, record] of loginAttempts.entries()) {
    // Remove if:
    // 1. Not blocked and attempt window passed
    // 2. Blocked but block expired and no activity for 10 minutes
    const windowExpired = now - record.firstAttemptTime > ATTEMPT_WINDOW;
    const blockExpired = record.blockedUntil
      ? now > record.blockedUntil + 10 * 60 * 1000
      : false;

    if ((!record.blockedUntil && windowExpired) || blockExpired) {
      expiredIps.push(ip);
    }
  }

  expiredIps.forEach((ip) => loginAttempts.delete(ip));

  if (expiredIps.length > 0) {
    console.log(
      `[LOGIN_RATE_LIMIT] Cleaned up ${expiredIps.length} expired records`
    );
  }
}

// Cleanup every 5 minutes
setInterval(cleanupOldRecords, 5 * 60 * 1000);
