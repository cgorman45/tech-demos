const ASKS = [
  "The token format is unchanged on my side.",
  "I am on the middleware. Tests still fail on refresh.",
  "I can look. Give me the file you mean.",
]

export function replyFor(body: string, rng: () => number): string {
  const lower = body.toLowerCase()
  if (lower.includes("handoff from")) {
    const choices = ["done", "blocked on the failing test", "question: which file should I open?"]
    return choices[Math.floor(rng() * choices.length)] ?? "done"
  }
  return ASKS[Math.floor(rng() * ASKS.length)] ?? ASKS[0]!
}
