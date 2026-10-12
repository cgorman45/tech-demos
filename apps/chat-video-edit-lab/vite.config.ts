import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "single" ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build:
    mode === "single"
      ? { outDir: "dist-single", assetsInlineLimit: 100000000 }
      : {},
}));
