#!/usr/bin/env bash
# Cloud Agent bootstrap for the Tech Demos monorepo.
# Installs Bun (if missing) and installs dependencies for every app under apps/.
# Safe to run repeatedly.
set -euo pipefail

if ! command -v bun >/dev/null 2>&1 && [ ! -x "$HOME/.bun/bin/bun" ]; then
  curl -fsSL https://bun.sh/install | bash
fi

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

bun --version

for pkg in apps/*/package.json; do
  [ -e "$pkg" ] || continue
  app_dir="$(dirname "$pkg")"
  echo "==> Installing dependencies in ${app_dir}"
  (cd "$app_dir" && bun install --frozen-lockfile)
done

echo "Cloud Agent install complete."
