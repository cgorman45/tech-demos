export const TESTED_VERSION = "0.10.8"

export const INSTALL_LINES = {
  unix: "curl -fsSL https://github.com/reason-machines/reason-network/releases/latest/download/install.sh | sh",
  windows:
    "irm https://github.com/reason-machines/reason-network/releases/latest/download/install.ps1 | iex",
} as const

export function installLine(platform: NodeJS.Platform): string {
  return platform === "win32" ? INSTALL_LINES.windows : INSTALL_LINES.unix
}

export function parseVersion(text: string): string | null {
  const match = text.match(/(\d+\.\d+\.\d+)/)
  return match ? match[1]! : null
}

export function versionWarning(actual: string | null): string | null {
  if (!actual) return null
  const parts = actual.split(".")
  const tested = TESTED_VERSION.split(".")
  if (parts[0] !== tested[0] || parts[1] !== tested[1]) {
    return `This dashboard was tested with reason-network ${TESTED_VERSION}. This machine has ${actual}.`
  }
  return null
}
