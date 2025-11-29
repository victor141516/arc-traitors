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
      error.value = data.error || "Error loading Hall of Traitors";
    }
  } catch (err) {
    error.value = "Connection error. Ensure backend is running.";
    console.error("Error fetching leaderboard:", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchLeaderboard();
});
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center mb-6 px-2">
      <div class="flex flex-col gap-2 w-full">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">👑</span>
            <h2
              class="text-xl font-black text-yellow-500 tracking-tighter uppercase"
            >
              Hall of Traitors
            </h2>
          </div>
          <button
            @click="fetchLeaderboard"
            :disabled="isLoading"
            class="text-[10px] font-mono text-yellow-500 hover:text-yellow-400 border border-yellow-900/50 px-2 py-1 hover:bg-yellow-900/20 transition-colors"
          >
            <span v-if="isLoading">SYNCING...</span>
            <span v-else>REFRESH_DATA</span>
          </button>
        </div>
        <p class="text-xs text-yellow-500/50 font-mono">
          TOP 20 MOST WANTED - HIGH VALUE TARGETS
        </p>
      </div>
    </div>

    <div
      v-if="error"
      class="bg-red-900/20 text-red-400 border border-red-800 p-4 font-mono text-xs mb-4"
    >
      ERROR: {{ error }}
    </div>

    <div v-if="isLoading && leaderboard.length === 0" class="text-center py-12">
      <div class="inline-block w-2 h-2 bg-yellow-500 animate-ping mr-2"></div>
      <span class="text-yellow-500 font-mono text-xs"
        >ACCESSING ARCHIVES...</span
      >
    </div>

    <div
      v-else-if="leaderboard.length === 0 && !isLoading"
      class="text-center py-12 border border-dashed border-yellow-900/30"
    >
      <p class="text-yellow-500/50 font-mono text-xs">NO DATA FOUND.</p>
    </div>

    <div
      v-else
      class="overflow-y-auto pr-2 space-y-4 custom-scrollbar flex-grow pb-8"
    >
      <!-- Top 3 Special Display -->
      <div class="grid grid-cols-1 gap-4 mb-8">
        <!-- #1 The Traitor King/Queen -->
        <router-link
          v-if="leaderboard[0]"
          :to="`/player/${leaderboard[0].playerName}`"
          class="relative bg-gradient-to-b from-yellow-900/20 to-black border border-yellow-600 p-6 text-center transform hover:scale-[1.02] transition-transform duration-300 cursor-pointer block"
        >
          <div
            class="absolute -top-6 left-1/2 -translate-x-1/2 text-6xl filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
          >
            👑
          </div>
          <div
            class="mt-6 mb-2 text-yellow-500 font-mono text-xs tracking-[0.2em]"
          >
            MOST WANTED
          </div>
          <h3
            class="text-4xl md:text-5xl font-black text-yellow-100 tracking-tighter mb-2 glitch-text"
            :data-text="leaderboard[0].playerName"
          >
            {{ leaderboard[0].playerName }}
          </h3>
          <div class="text-2xl font-mono text-red-500 font-bold">
            {{ leaderboard[0].votes }}
            <span class="text-xs text-red-500/50">REPORTS</span>
          </div>
          <div
            class="absolute top-2 right-2 text-yellow-500/20 font-black text-6xl select-none pointer-events-none"
          >
            #1
          </div>
        </router-link>

        <div class="grid grid-cols-2 gap-4">
          <!-- #2 -->
          <router-link
            v-if="leaderboard[1]"
            :to="`/player/${leaderboard[1].playerName}`"
            class="relative bg-gradient-to-b from-gray-800/20 to-black border border-gray-400 p-4 text-center cursor-pointer block"
          >
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl">
              🥈
            </div>
            <div
              class="mt-4 mb-1 text-gray-400 font-mono text-[10px] tracking-[0.2em]"
            >
              RUNNER UP
            </div>
            <h3
              class="text-xl md:text-2xl font-bold text-gray-200 tracking-tight mb-1"
            >
              {{ leaderboard[1].playerName }}
            </h3>
            <div class="text-lg font-mono text-red-400 font-bold">
              {{ leaderboard[1].votes }}
              <span class="text-[10px] text-red-400/50">REPORTS</span>
            </div>
            <div
              class="absolute top-2 right-2 text-gray-500/20 font-black text-4xl select-none pointer-events-none"
            >
              #2
            </div>
          </router-link>

          <!-- #3 -->
          <router-link
            v-if="leaderboard[2]"
            :to="`/player/${leaderboard[2].playerName}`"
            class="relative bg-gradient-to-b from-orange-900/20 to-black border border-orange-700 p-4 text-center cursor-pointer block"
          >
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl">
              🥉
            </div>
            <div
              class="mt-4 mb-1 text-orange-500 font-mono text-[10px] tracking-[0.2em]"
            >
              THIRD PLACE
            </div>
            <h3
              class="text-xl md:text-2xl font-bold text-orange-200 tracking-tight mb-1"
            >
              {{ leaderboard[2].playerName }}
            </h3>
            <div class="text-lg font-mono text-red-400 font-bold">
              {{ leaderboard[2].votes }}
              <span class="text-[10px] text-red-400/50">REPORTS</span>
            </div>
            <div
              class="absolute top-2 right-2 text-orange-500/20 font-black text-4xl select-none pointer-events-none"
            >
              #3
            </div>
          </router-link>
        </div>
      </div>

      <!-- Rest of the list (4-20) -->
      <div class="space-y-1">
        <router-link
          v-for="entry in leaderboard.slice(3)"
          :key="entry.rank"
          :to="`/player/${entry.playerName}`"
          class="group flex items-center gap-4 p-3 border-b border-yellow-900/10 hover:bg-yellow-900/10 transition-colors cursor-pointer block"
        >
          <!-- Rank -->
          <div class="font-mono text-yellow-500/50 text-xs w-8">
            #{{ entry.rank.toString().padStart(2, "0") }}
          </div>

          <!-- Name -->
          <div class="flex-grow">
            <div
              class="font-mono font-bold text-yellow-100 group-hover:text-yellow-500 transition-colors text-sm tracking-wider"
            >
              {{ entry.playerName }}
            </div>
          </div>

          <!-- Votes -->
          <div class="text-right">
            <div class="font-mono font-bold text-yellow-500 text-sm">
              {{ entry.votes }}
            </div>
          </div>
        </router-link>
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
  background: #854d0e;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #ca8a04;
}

.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.8;
}

.glitch-text::before {
  left: 2px;
  text-shadow: -1px 0 #ff0000;
  clip: rect(24px, 550px, 90px, 0);
  animation: glitch-anim-2 3s infinite linear alternate-reverse;
}

.glitch-text::after {
  left: -2px;
  text-shadow: -1px 0 #00ff00;
  clip: rect(85px, 550px, 140px, 0);
  animation: glitch-anim-2 2.5s infinite linear alternate-reverse;
}

@keyframes glitch-anim-2 {
  0% {
    clip: rect(14px, 9999px, 121px, 0);
  }
  20% {
    clip: rect(84px, 9999px, 56px, 0);
  }
  40% {
    clip: rect(23px, 9999px, 12px, 0);
  }
  60% {
    clip: rect(98px, 9999px, 145px, 0);
  }
  80% {
    clip: rect(4px, 9999px, 89px, 0);
  }
  100% {
    clip: rect(67px, 9999px, 23px, 0);
  }
}
</style>
