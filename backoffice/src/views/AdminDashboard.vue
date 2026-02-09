<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { config } from "../config";

interface Report {
  id: number;
  player_name: string;
  message?: string;
  reporter_ip?: string;
  voted_at: string;
}

interface Ban {
  ip: string;
  banned_until: string;
}

const router = useRouter();
const route = useRoute();
const reports = ref<Report[]>([]);
const bans = ref<Ban[]>([]);
const activeTab = ref<"reports" | "bans" | "autotest">((route.query.tab as any) || "reports");
const isLoading = ref(false);
const searchQuery = ref((route.query.q as string) || "");
const selectedPlayer = ref<string | null>((route.query.player as string) || null);
const selectedIp = ref<string | null>((route.query.ip as string) || null);

const formatDate = (dateString: string) => {
  let isoString = dateString;
  if (!isoString.endsWith("Z") && !isoString.includes("+")) {
    isoString += "Z";
  }
  return new Date(isoString).toLocaleString();
};

// Auto-test state
const autoTestEnabled = ref(false);
const autoTestPlayerNames = ref("");
const autoTestInterval = ref(10);
const autoTestRandomness = ref(50);
const autoTestStatus = ref<string>("");

const getToken = () => localStorage.getItem("shadow_ops_token");

const fetchReports = async (query?: string, playerFilter?: string, ipFilter?: string) => {
  isLoading.value = true;
  try {
    let urlString = `${config.apiBaseUrl}/api/admin/reports`;
    
    if (ipFilter) {
      urlString = `${config.apiBaseUrl}/api/admin/reports/ip/${encodeURIComponent(ipFilter)}`;
    }
    
    const url = new URL(urlString, window.location.origin);

    if (!ipFilter) {
      // If filtering by player, use player name as search query
      if (playerFilter) {
        url.searchParams.set("q", playerFilter);
      } else if (query) {
        url.searchParams.set("q", query);
      }
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 403 || res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    reports.value = data.reports || [];
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const syncStateFromUrl = () => {
  const { tab, q, player, ip } = route.query;
  
  activeTab.value = (tab as any) || "reports";
  searchQuery.value = (q as string) || "";
  selectedPlayer.value = (player as string) || null;
  selectedIp.value = (ip as string) || null;

  if (activeTab.value === "reports") {
    fetchReports(searchQuery.value, selectedPlayer.value || undefined, selectedIp.value || undefined);
  } else if (activeTab.value === "bans") {
    fetchBans();
  } else if (activeTab.value === "autotest") {
    fetchAutoTestStatus();
  }
};

watch(() => route.query, () => {
  syncStateFromUrl();
}, { deep: true });

const searchReports = () => {
  router.push({
    query: { ...route.query, q: searchQuery.value.trim() || undefined, player: undefined, ip: undefined }
  });
};

const clearSearch = () => {
  router.push({
    query: { ...route.query, q: undefined, player: undefined, ip: undefined }
  });
};

const viewPlayerReports = (playerName: string) => {
  router.push({
    query: { ...route.query, player: playerName, q: undefined, ip: undefined }
  });
};

const viewIpReports = (ip: string) => {
  router.push({
    query: { ...route.query, ip: ip, q: undefined, player: undefined }
  });
};

const backToAllReports = () => {
  router.push({
    query: { ...route.query, q: undefined, player: undefined, ip: undefined }
  });
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
    syncStateFromUrl();
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

const fetchAutoTestStatus = async () => {
  try {
    const res = await fetch(`${config.apiBaseUrl}/api/admin/autotest/status`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (data.success) {
      autoTestEnabled.value = data.enabled;
      if (data.config.playerNames && data.config.playerNames.length > 0) {
        autoTestPlayerNames.value = data.config.playerNames.join("\n");
      }
      autoTestInterval.value = data.config.baseIntervalSeconds;
      autoTestRandomness.value = data.config.randomnessPercent;
    }
  } catch (e) {
    console.error(e);
  }
};

const startAutoTest = async () => {
  if (!autoTestPlayerNames.value.trim()) {
    alert("Please enter at least one player name");
    return;
  }

  const playerNames = autoTestPlayerNames.value
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (playerNames.length === 0) {
    alert("Please enter at least one valid player name");
    return;
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/api/admin/autotest/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerNames,
        baseIntervalSeconds: autoTestInterval.value,
        randomnessPercent: autoTestRandomness.value,
      }),
    });

    const data = await res.json();
    if (data.success) {
      autoTestStatus.value = "Auto-testing started successfully";
      await fetchAutoTestStatus();
    } else {
      autoTestStatus.value = `Error: ${data.error}`;
    }
  } catch (e) {
    console.error(e);
    autoTestStatus.value = "Error starting auto-test";
  }
};

const stopAutoTest = async () => {
  try {
    const res = await fetch(`${config.apiBaseUrl}/api/admin/autotest/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await res.json();
    if (data.success) {
      autoTestStatus.value = "Auto-testing stopped";
      await fetchAutoTestStatus();
    } else {
      autoTestStatus.value = `Error: ${data.error}`;
    }
  } catch (e) {
    console.error(e);
    autoTestStatus.value = "Error stopping auto-test";
  }
};

onMounted(() => {
  if (!getToken()) {
    router.push("/");
    return;
  }
  syncStateFromUrl();
  fetchAutoTestStatus();
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
          router.push({ query: { tab: 'reports' } });
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
          router.push({ query: { tab: 'bans' } });
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
      <button
        @click="
          router.push({ query: { tab: 'autotest' } });
        "
        class="px-4 py-2 text-sm border transition-colors"
        :class="
          activeTab === 'autotest'
            ? 'border-blue-500 bg-blue-900/20 text-blue-300'
            : 'border-blue-900/30 text-blue-500/50 hover:text-blue-400'
        "
      >
        AUTO-TEST SYSTEM
      </button>
    </div>

    <!-- Search and Navigation -->
    <div v-if="activeTab === 'reports'" class="mb-4 space-y-4">
      <!-- Search Bar -->
      <div class="flex gap-2" v-if="!selectedPlayer && !selectedIp">
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

      <!-- Selected Player/IP View -->
      <div
        v-if="selectedPlayer || selectedIp"
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
            <div class="text-blue-300 font-bold" v-if="selectedPlayer">
              VIEWING REPORTS FOR PLAYER: {{ selectedPlayer }}
            </div>
            <div class="text-blue-300 font-bold" v-else-if="selectedIp">
              VIEWING REPORTS FROM IP: {{ selectedIp }}
            </div>
          </div>
          <button
            v-if="selectedPlayer"
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
            {{ formatDate(report.voted_at) }}
          </div>
          <div class="flex-grow">
            <div class="flex items-center gap-2">
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
              <button
                @click="viewIpReports(report.reporter_ip)"
                v-if="report.reporter_ip"
                class="text-[10px] text-blue-500/50 hover:text-blue-400 transition-colors px-1 border border-blue-900/30 hover:border-blue-500/50"
                :class="{
                  'text-blue-100 border-blue-500':
                    selectedIp === report.reporter_ip,
                }"
              >
                IP: {{ report.reporter_ip }}
              </button>
              <span v-else class="text-[10px] text-blue-500/20">IP: UNKNOWN</span>
            </div>
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

      <!-- Auto-Test Control -->
      <div v-if="activeTab === 'autotest'" class="space-y-6">
        <div class="border border-blue-900/30 bg-blue-900/10 p-4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-blue-300 font-bold text-lg">
                AUTO-TEST SYSTEM STATUS
              </h3>
              <div class="text-xs text-blue-500/50 mt-1">
                Automatically generate test reports for QA purposes
              </div>
            </div>
            <div
              class="px-4 py-2 text-sm font-bold"
              :class="
                autoTestEnabled
                  ? 'text-green-400 border border-green-500/30 bg-green-900/20'
                  : 'text-red-400 border border-red-500/30 bg-red-900/20'
              "
            >
              {{ autoTestEnabled ? "ACTIVE" : "INACTIVE" }}
            </div>
          </div>

          <div
            v-if="autoTestStatus"
            class="mb-4 p-2 border border-blue-500/30 bg-blue-900/20 text-blue-300 text-sm"
          >
            {{ autoTestStatus }}
          </div>
        </div>

        <div class="space-y-4">
          <!-- Player Names -->
          <div>
            <label class="block text-blue-400 text-sm mb-2"
              >PLAYER NAMES (one per line):</label
            >
            <textarea
              v-model="autoTestPlayerNames"
              placeholder="PlayerOne&#10;PlayerTwo&#10;PlayerThree&#10;..."
              class="w-full h-64 bg-black border border-blue-900 text-blue-400 px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono resize-y"
              :disabled="autoTestEnabled"
            ></textarea>
            <div class="text-xs text-blue-500/50 mt-1">
              Enter a list of player names to use for testing. Each name on a
              new line.
            </div>
          </div>

          <!-- Configuration -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-blue-400 text-sm mb-2"
                >BASE INTERVAL (seconds):</label
              >
              <input
                v-model.number="autoTestInterval"
                type="number"
                min="1"
                max="3600"
                class="w-full bg-black border border-blue-900 text-blue-400 px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono"
                :disabled="autoTestEnabled"
              />
              <div class="text-xs text-blue-500/50 mt-1">
                Base time between reports (in seconds)
              </div>
            </div>

            <div>
              <label class="block text-blue-400 text-sm mb-2"
                >RANDOMNESS (%):</label
              >
              <input
                v-model.number="autoTestRandomness"
                type="number"
                min="0"
                max="100"
                class="w-full bg-black border border-blue-900 text-blue-400 px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono"
                :disabled="autoTestEnabled"
              />
              <div class="text-xs text-blue-500/50 mt-1">
                Example: 50% of 10s = 5-15 seconds
              </div>
            </div>
          </div>

          <!-- Control Buttons -->
          <div class="flex gap-4">
            <button
              v-if="!autoTestEnabled"
              @click="startAutoTest"
              class="flex-1 px-6 py-3 text-sm border border-green-500 text-green-400 hover:bg-green-900/20 transition-colors font-bold"
            >
              START AUTO-TEST
            </button>
            <button
              v-else
              @click="stopAutoTest"
              class="flex-1 px-6 py-3 text-sm border border-red-500 text-red-400 hover:bg-red-900/20 transition-colors font-bold"
            >
              STOP AUTO-TEST
            </button>
            <button
              @click="fetchAutoTestStatus"
              class="px-6 py-3 text-sm border border-blue-500 text-blue-400 hover:bg-blue-900/20 transition-colors"
            >
              REFRESH STATUS
            </button>
          </div>

          <!-- Warning -->
          <div class="border border-yellow-500/30 bg-yellow-900/10 p-4">
            <div class="text-yellow-400 font-bold text-sm mb-2">⚠️ WARNING</div>
            <div class="text-yellow-500/80 text-xs space-y-1">
              <p>• Auto-testing will generate fake reports continuously</p>
              <p>• All generated reports are marked with [TEST] prefix</p>
              <p>• This feature is for QA and development purposes only</p>
              <p>• Remember to stop auto-testing when done</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
