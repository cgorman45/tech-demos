export type AuthInput = {
  host: string | undefined
  origin: string | undefined
  authorization: string | undefined
  urlToken: string | undefined
  token: string
  port: number
  requireToken: boolean
}

export type AuthResult = { ok: true } | { ok: false; status: number; error: string }

export function allowedHosts(port: number): string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`]
}

export function allowedOrigins(port: number): string[] {
  return [`http://127.0.0.1:${port}`, `http://localhost:${port}`]
}

export function authorize(input: AuthInput): AuthResult {
  const host = (input.host ?? "").trim().toLowerCase()
  if (!allowedHosts(input.port).includes(host)) {
    return { ok: false, status: 403, error: "bad host" }
  }
  const origin = input.origin
  if (origin !== undefined && origin !== "null" && !allowedOrigins(input.port).includes(origin)) {
    return { ok: false, status: 403, error: "bad origin" }
  }
  if (!input.requireToken) return { ok: true }
  const header = input.authorization?.startsWith("Bearer ")
    ? input.authorization.slice("Bearer ".length).trim()
    : ""
  const presented = header || (input.urlToken ?? "")
  if (!presented || !safeEqual(presented, input.token)) {
    return { ok: false, status: 401, error: "bad token" }
  }
  return { ok: true }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left[i]! ^ right[i]!
  return diff === 0
}
