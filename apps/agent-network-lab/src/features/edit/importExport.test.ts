import { expect, test } from "bun:test"
import { emptyBackup, parseBackup } from "./importExport.ts"

test("a valid backup imports and a bad file says why", () => {
  const backup = emptyBackup(null)
  backup.nicknames["session:colton/worker"] = "Worker"
  backup.log.push({ id: "1", at: 1, kind: "ask", body: "hi", to: "colton/worker" })
  const parsed = parseBackup(JSON.stringify(backup))
  expect(parsed.ok).toBe(true)
  if (parsed.ok) expect(parsed.data.nicknames["session:colton/worker"]).toBe("Worker")

  const broken = parseBackup("{")
  expect(broken.ok).toBe(false)
  if (!broken.ok) expect(broken.error).toContain("not valid JSON")

  const wrong = parseBackup(JSON.stringify({ version: 2, nicknames: [] }))
  expect(wrong.ok).toBe(false)
  if (!wrong.ok) expect(wrong.error.startsWith("Import failed.")).toBe(true)
})
