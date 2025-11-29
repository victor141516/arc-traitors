<script setup lang="ts">
import { ref } from "vue";
import VoteForm from "../components/VoteForm.vue";
import RecentReports from "../components/RecentReports.vue";
import PlayerSearch from "../components/PlayerSearch.vue";

const recentReportsRef = ref<InstanceType<typeof RecentReports> | null>(null);

const handleVoteSuccess = () => {
  // Refresh recent reports when a vote is successful
  if (recentReportsRef.value) {
    recentReportsRef.value.refresh();
  }
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <!-- Left Column: Report & Search (Action Area) -->
    <div class="lg:col-span-4 flex flex-col gap-8">
      <div class="traitor-panel">
        <h2
          class="text-red-500 font-bold mb-4 flex items-center gap-2 text-sm tracking-widest border-b border-red-900/30 pb-2"
        >
          <span class="text-lg">📝</span> REPORT INCIDENT
        </h2>
        <p class="text-gray-400 text-xs mb-6 font-mono leading-relaxed">
          If you have been a victim of treason, report it immediately. Your
          information helps keep the community safe.
        </p>
        <VoteForm @vote-success="handleVoteSuccess" />
      </div>

      <div class="traitor-panel">
        <h2
          class="text-red-500 font-bold mb-4 flex items-center gap-2 text-sm tracking-widest border-b border-red-900/30 pb-2"
        >
          <span class="text-lg">🔍</span> SEARCH RECORDS
        </h2>
        <PlayerSearch />
      </div>
    </div>

    <!-- Right Column: The Blacklist (Data Display) -->
    <div class="lg:col-span-8">
      <div class="traitor-panel h-full min-h-[600px]">
        <div
          class="flex justify-between items-end mb-6 border-b border-red-900/30 pb-4"
        >
          <div>
            <h2 class="text-2xl font-black text-red-600 tracking-tighter mb-1">
              RECENT ACTIVITY
            </h2>
            <p class="text-xs text-red-400/50 font-mono">
              REAL-TIME TREASON REPORTS
            </p>
          </div>
          <div class="text-right hidden md:block">
            <div class="text-xs text-red-500 font-mono">HIGH PRIORITY</div>
            <div class="text-[10px] text-red-900 font-mono">
              REAL-TIME UPDATE
            </div>
          </div>
        </div>

        <RecentReports ref="recentReportsRef" />
      </div>
    </div>
  </div>
</template>
