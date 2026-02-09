import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/admin/",
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5174,
    host: true,
    hmr: {
      clientPort: 8180,
    },
    watch: {
      usePolling: true,
    },
  },
});
