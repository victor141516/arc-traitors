<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { config } from "../config";

interface SearchResult {
  playerName: string;
  votes: number;
}

const router = useRouter();
const query = ref("");
const results = ref<SearchResult[]>([]);
const isLoading = ref(false);
const showResults = ref(false);

let debounceTimeout: ReturnType<typeof setTimeout>;

const searchPlayers = async () => {
  if (!query.value.trim()) {
    results.value = [];
    showResults.value = false;
    return;
  }

  isLoading.value = true;
  showResults.value = true;

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/search?q=${encodeURIComponent(query.value)}`
    );
    const data = await response.json();

    if (data.success) {
      results.value = data.results;
    }
  } catch (error) {
    console.error("Error searching players:", error);
  } finally {
    isLoading.value = false;
  }
};

watch(query, () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    searchPlayers();
  }, 300);
});

const selectPlayer = (player: SearchResult) => {
  query.value = "";
  showResults.value = false;
  router.push(`/player/${encodeURIComponent(player.playerName)}`);
};
</script>

<template>
  <div class="relative">
    <div class="relative">
      <label
        class="block text-[10px] text-red-500 font-mono mb-1 tracking-widest"
      >
        SEARCH PLAYER RECORDS
      </label>
      <div class="flex items-center border border-red-900/50 bg-black/50">
        <span class="pl-3 text-red-500">🔍</span>
        <input
          v-model="query"
          type="text"
          placeholder="CONSULTAR ANTECEDENTES..."
          class="bg-transparent border-none text-red-100 placeholder-red-900/50 w-full outline-none text-sm font-mono p-3"
          @focus="showResults = true"
        />
      </div>

      <!-- Loading Indicator -->
      <div
        v-if="isLoading"
        class="absolute right-3 top-8 animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"
      ></div>

      <!-- Results Dropdown -->
      <div
        v-if="showResults && (results.length > 0 || (query && !isLoading))"
        class="absolute z-20 w-full mt-1 bg-black border border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.2)] max-h-60 overflow-y-auto custom-scrollbar"
      >
        <ul v-if="results.length > 0" class="divide-y divide-red-900/30">
          <li
            v-for="player in results"
            :key="player.playerName"
            @click="selectPlayer(player)"
            class="px-4 py-3 hover:bg-red-900/20 cursor-pointer flex justify-between items-center transition-colors group"
          >
            <span
              class="text-red-400 font-mono text-sm group-hover:text-red-200"
            >
              {{ player.playerName }}
            </span>
            <span
              class="bg-red-900/30 text-red-500 text-[10px] font-mono px-2 py-1 border border-red-900/50"
            >
              {{ player.votes }} REPORTES
            </span>
          </li>
        </ul>
        <div
          v-else-if="query && !isLoading"
          class="px-4 py-3 text-red-500/50 text-center text-xs font-mono"
        >
          NO SE ENCONTRARON REGISTROS
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
