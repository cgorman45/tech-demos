import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `--mode single` (bun run build:single) inlines all JS, CSS, and fonts into
// one HTML file that works from file:// with no server and no network.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "single" ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: mode === "single" ? { outDir: "dist-single" } : {},
}));
