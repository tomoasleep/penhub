import { join } from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @open-pencil/core がバンドルフォント (/Inter-*.ttf 等) を web ルート直下で
// 要求するため、パッケージ同梱の assets を public として配信する。
const require = createRequire(import.meta.url);
const coreAssetsDir = join(require.resolve("@open-pencil/core/package.json"), "../assets");

export default defineConfig({
  plugins: [react()],
  publicDir: coreAssetsDir,
  esbuild: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
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
