<script setup lang="ts">
import { ref, onMounted } from "vue";
import { config } from "../config";

interface LeaderboardEntry {
  playerName: string;
  votes: number;
  rank: number;
}

const leaderboard = ref<LeaderboardEntry[]>([]);
const isLoading = ref(false);
const error = ref("");

const fetchLeaderboard = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/leaderboard`);
    const data = await response.json();

    if (data.success) {
      leaderboard.value = data.leaderboard;
    } else {
      error.value = data.error || "Error loading leaderboard";
    }
  } catch (err) {
    error.value = "Connection error. Ensure backend is running.";
    console.error("Error fetching leaderboard:", err);
  } finally {
    isLoading.value = false;
  }
};

// Expose refresh method to parent
defineExpose({
  refresh: fetchLeaderboard,
});

onMounted(() => {
  fetchLeaderboard();
});
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center mb-4 px-2">
      <div class="flex flex-col gap-2 w-full">
        <button
          @click="fetchLeaderboard"
          :disabled="isLoading"
          class="w-fit self-end text-[10px] font-mono text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 hover:bg-red-900/20 transition-colors"
        >
          <span v-if="isLoading">SYNCING...</span>
          <span v-else>REFRESH_DATA</span>
        </button>
        <div class="flex gap-4 text-[10px] font-mono text-red-500/50">
          <span class="w-8">ID_REF</span>
          <span class="w-8"></span>
          <span class="flex-1">SUBJECT_NAME</span>
          <span>THREAT_LEVEL</span>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="bg-red-900/20 text-red-400 border border-red-800 p-4 font-mono text-xs mb-4"
    >
      ERROR: {{ error }}
    </div>

    <div v-if="isLoading && leaderboard.length === 0" class="text-center py-12">
      <div class="inline-block w-2 h-2 bg-red-500 animate-ping mr-2"></div>
      <span class="text-red-500 font-mono text-xs">ACCESSING DATABASE...</span>
    </div>

    <div
      v-else-if="leaderboard.length === 0 && !isLoading"
      class="text-center py-12 border border-dashed border-red-900/30"
    >
      <p class="text-red-500/50 font-mono text-xs">
        NO THREATS DETECTED. SYSTEM STANDBY.
      </p>
    </div>

    <div
      v-else
      class="overflow-y-auto pr-2 space-y-1 custom-scrollbar flex-grow"
    >
      <div
        v-for="entry in leaderboard"
        :key="entry.rank"
        class="group flex items-center gap-4 p-3 border-b border-red-900/10 hover:bg-red-900/10 transition-colors cursor-default"
      >
        <!-- Rank / ID -->
        <div class="font-mono text-red-500/50 text-xs w-8">
          #{{ entry.rank.toString().padStart(3, "0") }}
        </div>

        <!-- Avatar Placeholder -->
        <div
          class="w-8 h-8 bg-red-900/20 border border-red-900/50 flex items-center justify-center"
        >
          <span class="text-red-500 text-xs">?</span>
        </div>

        <!-- Name -->
        <div class="flex-grow">
          <router-link
            :to="`/player/${encodeURIComponent(entry.playerName)}`"
            class="font-mono font-bold text-red-100 group-hover:text-red-500 transition-colors text-sm tracking-wider hover:underline cursor-pointer"
          >
            {{ entry.playerName }}
          </router-link>
          <div class="text-[10px] text-red-500/40 font-mono">
            STATUS: WANTED
          </div>
        </div>

        <!-- Threat Level (Votes) -->
        <div class="text-right">
          <div class="font-mono font-bold text-red-500 text-lg">
            {{ entry.votes }}
          </div>
          <div class="text-[9px] text-red-500/40 font-mono uppercase">
            Reports
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(20, 0, 0, 0.2);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a1a1a;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #8b0000;
}
</style>
