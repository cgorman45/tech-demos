#!/usr/bin/env node
let data = ""
process.stdin.on("data", (chunk) => {
  data += chunk
})
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), stdin: data }))
})
