<script setup lang="ts">
import { ref, onMounted } from "vue";

const isOpen = ref(false);
const STORAGE_KEY = "arc-traitors-help-seen";

// Check if user has seen the modal before
onMounted(() => {
  const hasSeenModal = localStorage.getItem(STORAGE_KEY);
  if (!hasSeenModal) {
    isOpen.value = true;
  }
});

// Open modal (called from parent via button)
const open = () => {
  isOpen.value = true;
};

// Close modal and mark as seen
const close = () => {
  isOpen.value = false;
  localStorage.setItem(STORAGE_KEY, "true");
};

// Expose open method to parent
defineExpose({
  open,
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="relative w-full max-w-2xl bg-black border-2 border-red-600 shadow-2xl shadow-red-900/50 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          <!-- Close button -->
          <button
            @click="close"
            class="absolute top-4 right-4 z-10 text-red-500 hover:text-red-400 transition-colors text-2xl font-bold w-8 h-8 flex items-center justify-center border border-red-900/50 hover:border-red-500 bg-black/50"
          >
            ×
          </button>

          <!-- Image placeholder - full width at top -->
          <div
            class="w-full bg-gradient-to-b from-red-900/20 to-black border-b-2 border-red-900/30 flex items-center justify-center"
          >
            <!-- Placeholder for future image -->
            <img src="../assets/help-header.jpg" />
          </div>

          <!-- Modal content -->
          <div class="p-8">
            <h2
              class="text-3xl font-black text-red-600 tracking-tighter uppercase mb-4 glitch-text"
              data-text="WELCOME, OPERATIVE"
            >
              WELCOME, OPERATIVE
            </h2>

            <div
              class="space-y-4 text-gray-300 font-mono text-sm leading-relaxed"
            >
              <p class="text-red-400 font-bold">
                ⚠️ CLASSIFIED DATABASE ACCESS GRANTED ⚠️
              </p>

              <p>
                Welcome to the
                <span class="text-yellow-500 font-bold">ARC TRAITORS</span>
                intelligence network. This is a community-driven database where
                Arc Riders report and track players who have betrayed their
                trust in-game.
              </p>

              <p>
                <span class="text-red-500">→</span> Submit incident reports on
                traitors<br />
                <span class="text-red-500">→</span> Check the Hall of Traitors
                for the most notorious players<br />
                <span class="text-red-500">→</span> Search any player's
                reputation before teaming up
              </p>

              <p
                class="text-yellow-500/70 text-xs italic border-t border-red-900/30 pt-4"
              >
                Remember: This database is maintained by the community, for the
                community. Use it responsibly and help keep Arc Riders safe from
                betrayal.
              </p>

              <div class="flex justify-center pt-4">
                <button
                  @click="close"
                  class="px-6 py-3 bg-red-900/20 border-2 border-red-600 text-red-500 font-bold uppercase tracking-wider hover:bg-red-900/30 hover:border-red-500 transition-all transform hover:scale-105"
                >
                  [ UNDERSTOOD - PROCEED ]
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(20, 0, 0, 0.2);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #7f1d1d;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #991b1b;
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
  animation: glitch-anim 3s infinite linear alternate-reverse;
}

.glitch-text::after {
  left: -2px;
  text-shadow: -1px 0 #00ff00;
  clip: rect(85px, 550px, 140px, 0);
  animation: glitch-anim 2.5s infinite linear alternate-reverse;
}

@keyframes glitch-anim {
  0% {
    clip: rect(34px, 9999px, 11px, 0);
  }
  20% {
    clip: rect(68px, 9999px, 89px, 0);
  }
  40% {
    clip: rect(12px, 9999px, 6px, 0);
  }
  60% {
    clip: rect(94px, 9999px, 23px, 0);
  }
  80% {
    clip: rect(12px, 9999px, 64px, 0);
  }
  100% {
    clip: rect(45px, 9999px, 32px, 0);
  }
}
</style>
