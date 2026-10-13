import { viteSingleFile } from "vite-plugin-singlefile"
import { defineConfig, mergeConfig } from "vite"
import base from "./vite.config"

export default mergeConfig(
  base,
  defineConfig({
    plugins: [viteSingleFile()],
    build: {
      outDir: "dist-single",
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100000000,
    },
  }),
)
