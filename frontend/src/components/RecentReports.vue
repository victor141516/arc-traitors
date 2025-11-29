<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { io, Socket } from "socket.io-client";
import { config } from "../config";

interface RecentReport {
  id: number;
  playerName: string;
  votedAt: string;
}

const reports = ref<RecentReport[]>([]);
const isLoading = ref(false);
const error = ref("");
const isMobile = ref(window.innerWidth < 1024); // lg breakpoint
let socket: Socket | null = null;

const displayedReports = computed(() => {
  if (isMobile.value) {
    return reports.value.slice(0, 5);
  }
  return reports.value;
});

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024;
};

const fetchRecentReports = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/recent`);
    const data = await response.json();

    if (data.success) {
      reports.value = data.recentReports;
    } else {
      error.value = data.error || "Error loading recent reports";
    }
  } catch (err) {
    error.value = "Connection error. Ensure backend is running.";
    console.error("Error fetching recent reports:", err);
  } finally {
    isLoading.value = false;
  }
};

const setupSocket = () => {
  socket = io(config.apiBaseUrl);

  socket.on("connect", () => {
    console.log("Connected to WebSocket");
  });

  socket.on("new_vote", (data: { playerName: string; votedAt: string }) => {
    // Add new report to the top of the list
    reports.value.unshift({
      id: Date.now(), // Temporary ID for frontend
      playerName: data.playerName,
      votedAt: data.votedAt,
    });

    // Keep only last 50 reports
    if (reports.value.length > 50) {
      reports.value.pop();
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket");
  });
};

// Expose refresh method to parent
defineExpose({
  refresh: fetchRecentReports,
});

onMounted(() => {
  fetchRecentReports();
  setupSocket();
  window.addEventListener("resize", updateIsMobile);
});

onUnmounted(() => {
  if (socket) {
    socket.disconnect();
  }
  window.removeEventListener("resize", updateIsMobile);
});

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center mb-4 px-2">
      <div class="flex flex-col gap-2 w-full">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
            ></span>
            <span class="text-[10px] font-mono text-green-500">LIVE FEED</span>
          </div>
          <button
            @click="fetchRecentReports"
            :disabled="isLoading"
            class="text-[10px] font-mono text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 hover:bg-red-900/20 transition-colors"
          >
            <span v-if="isLoading">SYNCING...</span>
            <span v-else>REFRESH_DATA</span>
          </button>
        </div>
        <div class="flex gap-4 text-[10px] font-mono text-red-500/50 mt-2">
          <span class="w-12">TIME</span>
          <span class="flex-1">SUBJECT_NAME</span>
          <span>STATUS</span>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="bg-red-900/20 text-red-400 border border-red-800 p-4 font-mono text-xs mb-4"
    >
      ERROR: {{ error }}
    </div>

    <div v-if="isLoading && reports.length === 0" class="text-center py-12">
      <div class="inline-block w-2 h-2 bg-red-500 animate-ping mr-2"></div>
      <span class="text-red-500 font-mono text-xs">ESTABLISHING UPLINK...</span>
    </div>

    <div
      v-else-if="reports.length === 0 && !isLoading"
      class="text-center py-12 border border-dashed border-red-900/30"
    >
      <p class="text-red-500/50 font-mono text-xs">
        NO RECENT ACTIVITY DETECTED.
      </p>
    </div>

    <div
      v-else
      class="overflow-y-auto pr-2 space-y-1 custom-scrollbar flex-grow"
    >
      <transition-group name="list">
        <div
          v-for="report in displayedReports"
          :key="report.id"
          class="group flex items-center gap-4 p-3 border-b border-red-900/10 hover:bg-red-900/10 transition-colors cursor-default"
        >
          <!-- Time -->
          <div class="font-mono text-red-500/50 text-xs w-12">
            {{ formatTime(report.votedAt) }}
          </div>

          <!-- Name -->
          <div class="flex-grow">
            <router-link
              :to="`/player/${encodeURIComponent(report.playerName)}`"
              class="font-mono font-bold text-red-100 group-hover:text-red-500 transition-colors text-sm tracking-wider hover:underline cursor-pointer"
            >
              {{ report.playerName }}
            </router-link>
          </div>

          <!-- Status -->
          <div class="text-right">
            <div
              class="text-[10px] text-red-500 font-mono uppercase bg-red-900/20 px-2 py-0.5 border border-red-900/50"
            >
              REPORTED
            </div>
          </div>
        </div>
      </transition-group>
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

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
