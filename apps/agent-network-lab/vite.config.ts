import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { copyFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const root = path.dirname(fileURLToPath(import.meta.url))

function emitDoubleClickHtml(): Plugin {
  return {
    name: "emit-agent-network-html",
    apply: "build",
    closeBundle() {
      copyFileSync(path.join(root, "dist", "index.html"), path.join(root, "agent-network.html"))
    },
  }
}

export default defineConfig(({ mode }) => {
  const single = mode === "single"
  return {
    base: single ? "./" : "/",
    plugins: [
      react(),
      tailwindcss(),
      ...(single ? [viteSingleFile(), emitDoubleClickHtml()] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
      },
    },
    build: single
      ? {
          assetsInlineLimit: 100000000,
          cssCodeSplit: false,
          modulePreload: false,
        }
      : undefined,
  }
})
