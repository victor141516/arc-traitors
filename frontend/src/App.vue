<script setup lang="ts">
import { ref } from "vue";
import HelpModal from "./components/HelpModal.vue";

const helpModalRef = ref<InstanceType<typeof HelpModal> | null>(null);

const openHelp = () => {
  helpModalRef.value?.open();
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-black relative overflow-hidden">
    <!-- Background Grid -->
    <div
      class="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,1)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
    ></div>

    <!-- Vignette -->
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"
    ></div>

    <!-- Header -->
    <header
      class="relative z-10 border-b border-red-900/30 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4"
      >
        <div
          class="flex items-center gap-4 cursor-pointer"
          @click="$router.push('/')"
        >
          <div
            class="w-12 h-12 bg-red-900/20 border border-red-600 flex items-center justify-center animate-pulse"
          >
            <img src="./assets/header.jpg" class="h-12 w-12" />
          </div>
          <div>
            <h1
              class="text-3xl md:text-4xl font-black tracking-tighter text-red-600 uppercase glitch-effect"
              data-text="ARC TRAITORS"
            >
              ARC TRAITORS
            </h1>
            <p class="text-xs text-red-400/60 tracking-[0.2em] uppercase">
              Base de datos de traición comunitaria
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <router-link
            to="/hall-of-traitors"
            class="group flex items-center gap-2 px-4 py-2 bg-yellow-900/20 border-2 border-yellow-600 hover:bg-yellow-900/30 hover:border-yellow-500 transition-all duration-300 transform hover:scale-105"
          >
            <span class="text-2xl">👑</span>
            <div class="flex flex-col">
              <span
                class="text-lg md:text-xl font-black text-yellow-500 tracking-tighter uppercase group-hover:text-yellow-400 transition-colors"
              >
                HALL OF TRAITORS
              </span>
              <span
                class="text-[10px] text-yellow-500/50 font-mono tracking-wider"
              >
                VIEW TOP 20
              </span>
            </div>
          </router-link>

          <button
            @click="openHelp"
            class="flex items-center justify-center w-10 h-10 bg-red-900/20 border border-red-600 hover:bg-red-900/30 hover:border-red-500 transition-all transform hover:scale-110 text-red-500 font-bold text-lg"
            title="Help"
          >
            ?
          </button>

          <div
            class="hidden md:flex items-center gap-2 text-xs font-mono text-red-500/50"
          >
            <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            SYSTEM STATUS: MONITORING
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-red-900/20 py-6 text-center">
      <p
        class="text-[10px] text-red-900/40 font-mono uppercase tracking-widest"
      >
        ARC Traitors Database // Unauthorized Access Prohibited // Community
        Driven Intelligence
      </p>
    </footer>

    <!-- Help Modal -->
    <HelpModal ref="helpModalRef" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.glitch-effect {
  position: relative;
}

.glitch-effect::before,
.glitch-effect::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch-effect::before {
  left: 2px;
  text-shadow: -1px 0 #00ffff;
  clip: rect(44px, 450px, 56px, 0);
  animation: glitch-anim 5s infinite linear alternate-reverse;
}

.glitch-effect::after {
  left: -2px;
  text-shadow: -1px 0 #ff00ff;
  clip: rect(44px, 450px, 56px, 0);
  animation: glitch-anim2 5s infinite linear alternate-reverse;
}

@keyframes glitch-anim {
  0% {
    clip: rect(34px, 9999px, 11px, 0);
  }
  5% {
    clip: rect(68px, 9999px, 89px, 0);
  }
  10% {
    clip: rect(12px, 9999px, 6px, 0);
  }
  15% {
    clip: rect(94px, 9999px, 23px, 0);
  }
  20% {
    clip: rect(12px, 9999px, 64px, 0);
  }
  25% {
    clip: rect(45px, 9999px, 32px, 0);
  }
  30% {
    clip: rect(8px, 9999px, 16px, 0);
  }
  35% {
    clip: rect(56px, 9999px, 98px, 0);
  }
  40% {
    clip: rect(23px, 9999px, 45px, 0);
  }
  45% {
    clip: rect(78px, 9999px, 34px, 0);
  }
  50% {
    clip: rect(12px, 9999px, 56px, 0);
  }
  55% {
    clip: rect(89px, 9999px, 12px, 0);
  }
  60% {
    clip: rect(34px, 9999px, 78px, 0);
  }
  65% {
    clip: rect(67px, 9999px, 23px, 0);
  }
  70% {
    clip: rect(12px, 9999px, 89px, 0);
  }
  75% {
    clip: rect(45px, 9999px, 12px, 0);
  }
  80% {
    clip: rect(90px, 9999px, 56px, 0);
  }
  85% {
    clip: rect(23px, 9999px, 78px, 0);
  }
  90% {
    clip: rect(67px, 9999px, 34px, 0);
  }
  95% {
    clip: rect(12px, 9999px, 90px, 0);
  }
  100% {
    clip: rect(45px, 9999px, 12px, 0);
  }
}

@keyframes glitch-anim2 {
  0% {
    clip: rect(12px, 9999px, 89px, 0);
  }
  5% {
    clip: rect(34px, 9999px, 12px, 0);
  }
  10% {
    clip: rect(78px, 9999px, 45px, 0);
  }
  15% {
    clip: rect(12px, 9999px, 67px, 0);
  }
  20% {
    clip: rect(56px, 9999px, 23px, 0);
  }
  25% {
    clip: rect(90px, 9999px, 78px, 0);
  }
  30% {
    clip: rect(23px, 9999px, 12px, 0);
  }
  35% {
    clip: rect(67px, 9999px, 45px, 0);
  }
  40% {
    clip: rect(12px, 9999px, 90px, 0);
  }
  45% {
    clip: rect(45px, 9999px, 23px, 0);
  }
  50% {
    clip: rect(89px, 9999px, 67px, 0);
  }
  55% {
    clip: rect(23px, 9999px, 12px, 0);
  }
  60% {
    clip: rect(78px, 9999px, 56px, 0);
  }
  65% {
    clip: rect(12px, 9999px, 89px, 0);
  }
  70% {
    clip: rect(45px, 9999px, 34px, 0);
  }
  75% {
    clip: rect(90px, 9999px, 12px, 0);
  }
  80% {
    clip: rect(23px, 9999px, 67px, 0);
  }
  85% {
    clip: rect(67px, 9999px, 23px, 0);
  }
  90% {
    clip: rect(12px, 9999px, 78px, 0);
  }
  95% {
    clip: rect(56px, 9999px, 12px, 0);
  }
  100% {
    clip: rect(89px, 9999px, 45px, 0);
  }
}
</style>
