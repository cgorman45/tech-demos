import { pathToFileURL } from "node:url"
import { startBridge } from "./server.ts"

export function parseArgs(argv: string[]): { port: number; openBrowser: boolean } {
  let port = 4777
  let openBrowser = true
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--no-open") openBrowser = false
    else if (arg === "--port") {
      const value = Number(argv[++i])
      if (!Number.isInteger(value) || value < 0 || value > 65535) {
        throw new Error("Port must be an integer from 0 to 65535.")
      }
      port = value
    }
  }
  return { port, openBrowser }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const bridge = await startBridge(args)
  const shutdown = () => {
    void bridge.close().then(() => process.exit(0))
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "failed to start"
    console.error(`[bridge] ${message}`)
    process.exit(1)
  })
}
