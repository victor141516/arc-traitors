<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { config } from "../config";

interface Report {
  id: number;
  votedAt: string;
  message?: string;
}

interface PlayerDetails {
  playerName: string;
  totalVotes: number;
  rank: number | null;
  reports: Report[];
}

const route = useRoute();
const router = useRouter();
const playerDetails = ref<PlayerDetails | null>(null);
const isLoading = ref(false);
const error = ref("");

const fetchPlayerDetails = async (playerName: string) => {
  isLoading.value = true;
  error.value = "";
  playerDetails.value = null;

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/player/${encodeURIComponent(playerName)}`
    );
    const data = await response.json();

    if (data.success) {
      playerDetails.value = data.player;
    } else {
      error.value = data.error || "Player not found";
    }
  } catch (err) {
    error.value = "Connection error while fetching player details.";
    console.error("Error fetching player details:", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  const playerName = route.params.playerName as string;
  if (playerName) {
    fetchPlayerDetails(playerName);
  }
});

watch(
  () => route.params.playerName,
  (newName) => {
    if (newName) {
      fetchPlayerDetails(newName as string);
    }
  }
);

const goBack = () => {
  router.push("/");
};

const formatTime = (dateString: string) => {
  // Ensure dateString ends with Z if it doesn't have timezone info
  // This helps browsers interpret it as UTC
  let isoString = dateString;
  if (!isoString.endsWith("Z") && !isoString.includes("+")) {
    isoString += "Z";
  }
  const date = new Date(isoString);
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const expandedReports = ref<Set<number>>(new Set());

const toggleReport = (id: number) => {
  if (expandedReports.value.has(id)) {
    expandedReports.value.delete(id);
  } else {
    expandedReports.value.add(id);
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto w-full">
    <button
      @click="goBack"
      class="mb-6 text-xs font-mono text-red-500 hover:text-red-400 flex items-center gap-2 transition-colors"
    >
      ← BACK TO HOME
    </button>

    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block w-2 h-2 bg-red-500 animate-ping mr-2"></div>
      <span class="text-red-500 font-mono text-xs">LOADING DOSSIER...</span>
    </div>

    <div
      v-else-if="error"
      class="bg-red-900/20 text-red-400 border border-red-800 p-8 font-mono text-center"
    >
      <div class="text-4xl mb-4">🚫</div>
      <h2 class="text-xl font-bold mb-2">ACCESS ERROR</h2>
      <p class="text-sm opacity-70">{{ error }}</p>
    </div>

    <div
      v-else-if="playerDetails"
      class="grid grid-cols-1 md:grid-cols-3 gap-8"
    >
      <!-- Player Card -->
      <div class="md:col-span-1">
        <div class="traitor-panel sticky top-6">
          <div
            class="w-24 h-24 mx-auto bg-red-900/20 border border-red-500/50 flex items-center justify-center mb-4"
          >
            <span class="text-4xl">👤</span>
          </div>
          <h1
            class="text-2xl font-black text-center text-red-100 tracking-tighter mb-2 break-words"
          >
            {{ playerDetails.playerName }}
          </h1>
          <div class="text-center mb-6">
            <span
              class="inline-block px-3 py-1 bg-red-900/30 border border-red-500/30 text-red-500 text-xs font-mono"
            >
              STATUS: WANTED
            </span>
          </div>

          <div class="grid grid-cols-2 gap-4 border-t border-red-900/30 pt-4">
            <div class="text-center">
              <div class="text-[10px] text-red-500/50 font-mono mb-1">
                TOTAL REPORTS
              </div>
              <div class="text-2xl font-bold text-red-500 font-mono">
                {{ playerDetails.totalVotes }}
              </div>
            </div>
            <div class="text-center border-l border-red-900/30">
              <div class="text-[10px] text-red-500/50 font-mono mb-1">
                CURRENT RANK
              </div>
              <div class="text-2xl font-bold text-yellow-500 font-mono">
                {{ playerDetails.rank ? `#${playerDetails.rank}` : "N/A" }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Report History -->
      <div class="md:col-span-2">
        <div class="traitor-panel h-full">
          <h2
            class="text-red-500 font-bold mb-6 flex items-center gap-2 text-sm tracking-widest border-b border-red-900/30 pb-2"
          >
            <span class="text-lg">🗂️</span> INCIDENT HISTORY
          </h2>

          <div
            v-if="playerDetails.reports.length === 0"
            class="text-center py-8 text-red-500/50 font-mono text-xs"
          >
            NO REPORT DETAILS AVAILABLE.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="report in playerDetails.reports"
              :key="report.id"
              class="p-3 border border-red-900/20 bg-red-900/5 hover:bg-red-900/10 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="text-red-500 text-lg">⚠️</div>
                <div class="flex-grow">
                  <div class="text-red-200 text-sm font-bold tracking-wide">
                    TREASON REPORT
                  </div>
                  <div class="text-[10px] text-red-500/50 font-mono">
                    ID: {{ report.id }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs text-red-400 font-mono">
                    {{ formatTime(report.votedAt) }}
                  </div>
                </div>
              </div>

              <!-- Message Section -->
              <div v-if="report.message" class="mt-2 pl-9">
                <div
                  class="text-red-300/80 text-xs font-mono border-l-2 border-red-500/30 pl-2 cursor-pointer hover:text-red-200 transition-colors"
                  @click="toggleReport(report.id)"
                >
                  <div :class="{ truncate: !expandedReports.has(report.id) }">
                    {{ report.message }}
                  </div>
                  <div
                    v-if="
                      !expandedReports.has(report.id) &&
                      report.message.length > 50
                    "
                    class="text-[9px] text-red-500/50 mt-1"
                  >
                    ▼ CLICK TO EXPAND
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
