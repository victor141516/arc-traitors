<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { config } from "../config";

const key = ref("");
const error = ref("");
const isLoading = ref(false);
const router = useRouter();

const login = async () => {
  if (!key.value) return;

  isLoading.value = true;
  error.value = "";

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: key.value }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("shadow_ops_token", data.token);
      router.push("/console");
    } else {
      error.value = "ACCESS DENIED";
    }
  } catch (err) {
    error.value = "SYSTEM FAILURE";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-black flex items-center justify-center p-4 font-mono"
  >
    <div
      class="w-full max-w-md border border-blue-900/50 bg-blue-900/5 p-8 relative overflow-hidden"
    >
      <!-- Scanline -->
      <div
        class="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10 opacity-20"
      ></div>

      <div class="relative z-20">
        <div class="text-center mb-8">
          <div class="text-4xl mb-2">🛡️</div>
          <h1 class="text-blue-500 font-bold tracking-[0.2em] text-xl">
            SHADOW OPERATIONS
          </h1>
          <div class="text-blue-500/50 text-xs mt-2">
            RESTRICTED ACCESS AREA
          </div>
        </div>

        <form @submit.prevent="login" class="space-y-6">
          <div>
            <label class="block text-blue-500/70 text-xs mb-2"
              >SECURITY CLEARANCE KEY</label
            >
            <input
              v-model="key"
              type="password"
              class="w-full bg-black border border-blue-900 text-blue-400 px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors text-center tracking-widest"
              placeholder="••••••••••••"
              autofocus
            />
          </div>

          <div
            v-if="error"
            class="text-red-500 text-xs text-center animate-pulse"
          >
            >> {{ error }} <<
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-blue-900/20 border border-blue-500/50 text-blue-400 py-3 hover:bg-blue-900/40 hover:text-blue-300 transition-all duration-300 text-sm tracking-widest uppercase"
          >
            {{ isLoading ? "AUTHENTICATING..." : "INITIATE HANDSHAKE" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
