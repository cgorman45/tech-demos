#!/usr/bin/env bash
# Idempotent dependency setup for the tech-demos monorepo.
# Bootstraps the pinned Bun toolchain, then installs dependencies for every
# self-contained app under apps/*.
set -euo pipefail

BUN_VERSION="1.4.2"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version 2>/dev/null || true)" != "$BUN_VERSION" ]; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

bun --version

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

shopt -s nullglob
found_app=0
for pkg in "$repo_root"/apps/*/package.json; do
  found_app=1
  app_dir="$(dirname "$pkg")"
  echo "==> Installing dependencies in ${app_dir#"$repo_root"/}"
  (cd "$app_dir" && bun install)
done

if [ "$found_app" -eq 0 ]; then
  echo "No apps found under apps/*; nothing to install."
fi
