import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { openPencil } from "@open-pencil/core/node/vite";

export default defineConfig({
  plugins: [react(), openPencil()],
  esbuild: {
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["harfbuzzjs"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  resolve: {
    alias: {
      "node:process": join(import.meta.dirname, "src/process-shim.ts"),
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      shimMissingExports: true,
    },
  },
  worker: {
    format: "es",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
