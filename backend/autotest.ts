import { registerVote } from "./db";
import type { Server } from "socket.io";

interface AutoTestConfig {
  enabled: boolean;
  playerNames: string[];
  baseIntervalSeconds: number;
  randomnessPercent: number;
}

let ioInstance: Server | null = null;

let autoTestConfig: AutoTestConfig = {
  enabled: false,
  playerNames: [],
  baseIntervalSeconds: 10,
  randomnessPercent: 50,
};

let autoTestInterval: Timer | null = null;

/**
 * Calculate random interval based on base and randomness percentage
 */
function calculateRandomInterval(
  baseSeconds: number,
  randomnessPercent: number
): number {
  const randomnessFactor = randomnessPercent / 100;
  const minSeconds = baseSeconds * (1 - randomnessFactor);
  const maxSeconds = baseSeconds * (1 + randomnessFactor);
  const randomSeconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  return randomSeconds * 1000; // Convert to milliseconds
}

/**
 * Get random player name from the list
 */
function getRandomPlayerName(): string {
  if (autoTestConfig.playerNames.length === 0) {
    throw new Error("No player names configured for auto-testing");
  }
  const randomIndex = Math.floor(
    Math.random() * autoTestConfig.playerNames.length
  );
  const playerName = autoTestConfig.playerNames[randomIndex];
  if (!playerName) {
    throw new Error("Failed to get random player name");
  }
  return playerName;
}

/**
 * Schedule next auto-test vote
 */
function scheduleNextVote() {
  if (!autoTestConfig.enabled) {
    return;
  }

  const interval = calculateRandomInterval(
    autoTestConfig.baseIntervalSeconds,
    autoTestConfig.randomnessPercent
  );

  console.log(
    `[AUTOTEST] Next vote scheduled in ${(interval / 1000).toFixed(2)} seconds`
  );

  autoTestInterval = setTimeout(() => {
    try {
      const playerName = getRandomPlayerName();
      const { totalVotes } = registerVote(playerName);
      console.log(
        `[AUTOTEST] Generated test vote for "${playerName}" (total: ${totalVotes})`
      );

      // Emit socket event if io instance is available
      if (ioInstance) {
        ioInstance.emit("new_vote", {
          playerName,
          totalVotes,
          votedAt: new Date().toISOString(),
        });
      }

      // Schedule next vote
      scheduleNextVote();
    } catch (error) {
      console.error("[AUTOTEST] Error generating test vote:", error);
      // Try again after a short delay
      autoTestInterval = setTimeout(() => scheduleNextVote(), 5000);
    }
  }, interval);
}

/**
 * Set Socket.io instance for emitting events
 */
export function setSocketIo(io: Server): void {
  ioInstance = io;
}

/**
 * Start auto-testing
 */
export function startAutoTest(
  playerNames: string[],
  baseIntervalSeconds: number,
  randomnessPercent: number
): void {
  if (autoTestConfig.enabled) {
    console.log("[AUTOTEST] Already running, restarting with new config");
    stopAutoTest();
  }

  if (playerNames.length === 0) {
    throw new Error("Player names list cannot be empty");
  }

  if (baseIntervalSeconds <= 0) {
    throw new Error("Base interval must be greater than 0");
  }

  if (randomnessPercent < 0 || randomnessPercent > 100) {
    throw new Error("Randomness percent must be between 0 and 100");
  }

  autoTestConfig = {
    enabled: true,
    playerNames,
    baseIntervalSeconds,
    randomnessPercent,
  };

  console.log(
    `[AUTOTEST] Started with ${playerNames.length} players, base interval: ${baseIntervalSeconds}s, randomness: ${randomnessPercent}%`
  );
  scheduleNextVote();
}

/**
 * Stop auto-testing
 */
export function stopAutoTest(): void {
  if (autoTestInterval) {
    clearTimeout(autoTestInterval);
    autoTestInterval = null;
  }
  autoTestConfig.enabled = false;
  console.log("[AUTOTEST] Stopped");
}

/**
 * Get current auto-test configuration
 */
export function getAutoTestConfig(): AutoTestConfig {
  return { ...autoTestConfig };
}

/**
 * Check if auto-testing is enabled
 */
export function isAutoTestEnabled(): boolean {
  return autoTestConfig.enabled;
}
