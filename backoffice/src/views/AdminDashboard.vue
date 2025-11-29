<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { config } from "../config";

interface Report {
  id: number;
  player_name: string;
  message?: string;
  voted_at: string;
}

interface Ban {
  ip: string;
  banned_until: string;
}

const router = useRouter();
const reports = ref<Report[]>([]);
const bans = ref<Ban[]>([]);
const activeTab = ref<"reports" | "bans">("reports");
const isLoading = ref(false);
const searchQuery = ref("");
const selectedPlayer = ref<string | null>(null);

const getToken = () => localStorage.getItem("shadow_ops_token");

const fetchReports = async (query?: string, playerFilter?: string) => {
  isLoading.value = true;
  try {
    const url = new URL(`${config.apiBaseUrl}/api/admin/reports`);

    // If filtering by player, use player name as search query
    if (playerFilter) {
      url.searchParams.set("q", playerFilter);
    } else if (query) {
      url.searchParams.set("q", query);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 403 || res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    reports.value = data.reports;
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const searchReports = () => {
  if (searchQuery.value.trim()) {
    fetchReports(searchQuery.value);
  } else {
    fetchReports();
  }
};

const clearSearch = () => {
  searchQuery.value = "";
  selectedPlayer.value = null;
  fetchReports();
};

const viewPlayerReports = (playerName: string) => {
  selectedPlayer.value = playerName;
  searchQuery.value = "";
  fetchReports(undefined, playerName);
};

const backToAllReports = () => {
  selectedPlayer.value = null;
  searchQuery.value = "";
  fetchReports();
};

const fetchBans = async () => {
  isLoading.value = true;
  try {
    const res = await fetch(`${config.apiBaseUrl}/api/admin/bans`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    bans.value = data.bans;
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const deleteReport = async (id: number) => {
  if (!confirm("CONFIRM DELETION? THIS ACTION CANNOT BE UNDONE.")) return;

  try {
    await fetch(`${config.apiBaseUrl}/api/admin/reports/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    // Refresh current view
    if (selectedPlayer.value) {
      viewPlayerReports(selectedPlayer.value);
    } else if (searchQuery.value) {
      searchReports();
    } else {
      fetchReports();
    }
  } catch (e) {
    console.error(e);
  }
};

const deletePlayerReports = async (playerName: string) => {
  if (
    !confirm(
      `DELETE ALL REPORTS FOR ${playerName}? THIS ACTION CANNOT BE UNDONE.`
    )
  )
    return;

  try {
    await fetch(
      `${config.apiBaseUrl}/api/admin/player/${encodeURIComponent(playerName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    // After deleting all reports, go back to all reports view
    backToAllReports();
  } catch (e) {
    console.error(e);
  }
};

const revokeBan = async (ip: string) => {
  if (!confirm(`REVOKE BAN FOR ${ip}?`)) return;

  try {
    await fetch(
      `${config.apiBaseUrl}/api/admin/bans/${encodeURIComponent(ip)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );
    fetchBans();
  } catch (e) {
    console.error(e);
  }
};

const logout = () => {
  localStorage.removeItem("shadow_ops_token");
  router.push("/");
};

onMounted(() => {
  if (!getToken()) {
    router.push("/");
    return;
  }
  fetchReports();
});
</script>

<template>
  <div class="min-h-screen bg-black text-blue-400 font-mono p-4 md:p-8">
    <!-- Header -->
    <div
      class="flex justify-between items-center mb-8 border-b border-blue-900/50 pb-4"
    >
      <div>
        <h1 class="text-2xl font-bold tracking-widest text-blue-500">
          SHADOW OPERATIONS
        </h1>
        <div class="text-xs text-blue-500/50">COMMAND CONSOLE v1.0</div>
      </div>
      <button
        @click="logout"
        class="text-xs border border-blue-900 px-3 py-1 hover:bg-blue-900/20 transition-colors"
      >
        TERMINATE SESSION
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-4 mb-6">
      <button
        @click="
          activeTab = 'reports';
          clearSearch();
          fetchReports();
        "
        class="px-4 py-2 text-sm border transition-colors"
        :class="
          activeTab === 'reports'
            ? 'border-blue-500 bg-blue-900/20 text-blue-300'
            : 'border-blue-900/30 text-blue-500/50 hover:text-blue-400'
        "
      >
        INTELLIGENCE REPORTS
      </button>
      <button
        @click="
          activeTab = 'bans';
          fetchBans();
        "
        class="px-4 py-2 text-sm border transition-colors"
        :class="
          activeTab === 'bans'
            ? 'border-blue-500 bg-blue-900/20 text-blue-300'
            : 'border-blue-900/30 text-blue-500/50 hover:text-blue-400'
        "
      >
        ACTIVE CONTAINMENT (BANS)
      </button>
    </div>

    <!-- Search and Navigation -->
    <div v-if="activeTab === 'reports'" class="mb-4 space-y-4">
      <!-- Search Bar -->
      <div class="flex gap-2" v-if="!selectedPlayer">
        <input
          v-model="searchQuery"
          @keyup.enter="searchReports"
          placeholder="SEARCH REPORTS (PLAYER NAME OR MESSAGE)..."
          class="flex-1 bg-black border border-blue-900 text-blue-400 px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono"
        />
        <button
          @click="searchReports"
          class="px-4 py-2 text-xs border border-blue-500 text-blue-400 hover:bg-blue-900/20 transition-colors"
        >
          SEARCH
        </button>
        <button
          @click="clearSearch"
          class="px-4 py-2 text-xs border border-blue-900/50 text-blue-500/50 hover:bg-blue-900/20 hover:text-blue-400 transition-colors"
        >
          CLEAR
        </button>
      </div>

      <!-- Selected Player View -->
      <div
        v-if="selectedPlayer"
        class="border border-blue-900/30 bg-blue-900/5 p-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              @click="backToAllReports"
              class="text-xs border border-blue-900/50 text-blue-500/50 hover:bg-blue-900/20 hover:text-blue-400 transition-colors px-2 py-1"
            >
              ← BACK TO ALL REPORTS
            </button>
            <div class="text-blue-300 font-bold">
              VIEWING REPORTS FOR: {{ selectedPlayer }}
            </div>
          </div>
          <button
            @click="deletePlayerReports(selectedPlayer)"
            class="text-xs text-red-500 hover:text-red-400 border border-red-900/30 px-3 py-1 hover:bg-red-900/10"
          >
            DELETE ALL REPORTS FOR THIS USER
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div
      class="border border-blue-900/30 bg-blue-900/5 min-h-[500px] p-4 relative"
    >
      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm"
      >
        <div class="text-blue-500 animate-pulse">PROCESSING...</div>
      </div>

      <!-- Reports List -->
      <div v-if="activeTab === 'reports'" class="space-y-2">
        <div
          v-if="reports.length === 0"
          class="text-center py-12 text-blue-500/30"
        >
          NO INTELLIGENCE GATHERED
        </div>
        <div
          v-for="report in reports"
          :key="report.id"
          class="border border-blue-900/20 p-3 hover:bg-blue-900/10 transition-colors flex gap-4 items-start"
        >
          <div class="text-xs text-blue-500/50 w-32 shrink-0">
            {{ new Date(report.voted_at).toLocaleString() }}
          </div>
          <div class="flex-grow">
            <button
              @click="viewPlayerReports(report.player_name)"
              class="font-bold text-blue-300 hover:text-blue-100 transition-colors cursor-pointer text-left"
              :class="{
                'underline text-blue-100':
                  selectedPlayer === report.player_name,
              }"
            >
              {{ report.player_name }}
            </button>
            <div
              v-if="report.message"
              class="text-sm text-blue-400/80 mt-1 border-l-2 border-blue-500/30 pl-2"
            >
              {{ report.message }}
            </div>
          </div>
          <button
            @click="deleteReport(report.id)"
            class="text-xs text-red-500 hover:text-red-400 border border-red-900/30 px-2 py-1 hover:bg-red-900/10"
          >
            PURGE
          </button>
        </div>
      </div>

      <!-- Bans List -->
      <div v-if="activeTab === 'bans'" class="space-y-2">
        <div
          v-if="bans.length === 0"
          class="text-center py-12 text-blue-500/30"
        >
          NO ACTIVE CONTAINMENT PROTOCOLS
        </div>
        <div
          v-for="ban in bans"
          :key="ban.ip"
          class="border border-blue-900/20 p-3 hover:bg-blue-900/10 transition-colors flex justify-between items-center"
        >
          <div>
            <div class="font-bold text-blue-300">{{ ban.ip }}</div>
            <div class="text-xs text-blue-500/50">
              LIFTING AT: {{ new Date(ban.banned_until).toLocaleString() }}
            </div>
          </div>
          <button
            @click="revokeBan(ban.ip)"
            class="text-xs text-green-500 hover:text-green-400 border border-green-900/30 px-2 py-1 hover:bg-green-900/10"
          >
            REVOKE
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
