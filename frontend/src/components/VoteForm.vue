<script setup lang="ts">
import { ref } from "vue";
import { config } from "../config";

const playerName = ref("");
const reportMessage = ref("");
const isLoading = ref(false);
const message = ref("");
const messageType = ref<"success" | "error" | "">("");

const emit = defineEmits<{
  voteSuccess: [];
}>();

const submitVote = async () => {
  if (!playerName.value.trim()) {
    message.value = "ENTER SUBJECT IDENTIFICATION";
    messageType.value = "error";
    return;
  }

  isLoading.value = true;
  message.value = "";
  messageType.value = "";

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerName: playerName.value.trim(),
        message: reportMessage.value.trim(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      message.value = `REPORT REGISTERED. SUBJECT: ${data.playerName}. THREAT LEVEL UPDATED.`;
      messageType.value = "success";
      playerName.value = "";
      reportMessage.value = "";
      emit("voteSuccess");
    } else {
      message.value = data.error || "ERROR IN REPORT TRANSMISSION";
      messageType.value = "error";
    }
  } catch (error) {
    message.value = "CONNECTION ERROR WITH CENTRAL DATABASE.";
    messageType.value = "error";
    console.error("Error voting:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="relative">
    <form @submit.prevent="submitVote" class="space-y-4">
      <div>
        <label
          for="playerName"
          class="block text-[10px] text-red-500 font-mono mb-1 tracking-widest"
        >
          TRAITOR IDENTIFICATION
        </label>
        <input
          id="playerName"
          v-model="playerName"
          type="text"
          :disabled="isLoading"
          placeholder="PLAYER NAME..."
          class="input-warning"
        />
      </div>

      <div>
        <label
          for="reportMessage"
          class="block text-[10px] text-red-500 font-mono mb-1 tracking-widest"
        >
          INCIDENT DETAILS (OPTIONAL)
        </label>
        <textarea
          id="reportMessage"
          v-model="reportMessage"
          :disabled="isLoading"
          placeholder="DESCRIBE THE TREASON..."
          maxlength="1000"
          rows="3"
          class="input-warning resize-none"
        ></textarea>
        <div class="text-right text-[9px] text-red-500/50 font-mono mt-1">
          {{ reportMessage.length }}/1000
        </div>
      </div>

      <button
        type="submit"
        :disabled="isLoading || !playerName.trim()"
        class="btn-report group"
      >
        <span v-if="isLoading" class="animate-pulse">PROCESSING...</span>
        <span v-else class="flex items-center justify-center gap-2">
          <span class="text-xl">⚠️</span> REPORT TREASON
        </span>

        <!-- Button scanline effect -->
        <div
          class="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/10 to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 pointer-events-none"
        ></div>
      </button>
    </form>

    <div
      v-if="message"
      :class="[
        'mt-4 p-3 border-l-2 font-mono text-xs',
        messageType === 'success'
          ? 'bg-green-900/20 border-green-500 text-green-400'
          : '',
        messageType === 'error'
          ? 'bg-red-900/20 border-red-500 text-red-400'
          : '',
      ]"
    >
      <span class="font-bold mr-2">>> SYSTEM:</span>
      {{ message }}
    </div>
  </div>
</template>
