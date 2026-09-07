#!/usr/bin/env bash
# Runs the dev server for the current pick's app. The monorepo hosts one app
# per branch under apps/<slug>/, so this launches the first app that defines a
# "dev" script.
set -euo pipefail

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

shopt -s nullglob
for pkg in "$repo_root"/apps/*/package.json; do
  app_dir="$(dirname "$pkg")"
  if grep -q '"dev"' "$pkg"; then
    echo "==> Starting dev server in ${app_dir#"$repo_root"/}"
    cd "$app_dir"
    exec bun run dev
  fi
done

echo "No app with a \"dev\" script found under apps/*." >&2
exit 1
