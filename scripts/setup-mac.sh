#!/usr/bin/env bash
set -euo pipefail

mode="dev"
api_key=""

usage() {
  cat <<'USAGE'
Usage: scripts/setup-mac.sh [--dev|--package] [--api-key=<key>] [--help]

Options:
  --dev            Run in development mode with hot reload (default)
  --package        Build production bundles and create macOS app/dmg
  --api-key=<key>  Set GEMINI_API_KEY for the launched command
  --help           Show this help

Examples:
  scripts/setup-mac.sh --dev --api-key="YOUR_GEMINI_KEY"
  scripts/setup-mac.sh --package
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --dev) mode="dev" ;;
    --package) mode="package" ;;
    --api-key=*) api_key="${arg#*=}" ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown arg: $arg"; usage; exit 1 ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[warn] This script is tailored for macOS (Darwin). Continuing anyway..."
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[error] Node.js is required. Install Node 18+ from https://nodejs.org/" >&2
  exit 1
fi

node_ver=$(node -v | sed 's/^v//')
node_major=${node_ver%%.*}
if [[ "$node_major" -lt 18 ]]; then
  echo "[error] Node.js >= 18 is required (found $node_ver)." >&2
  exit 1
fi

echo "[info] Installing dependencies (this may take a minute)..."
npm install --legacy-peer-deps

if [[ "$mode" == "dev" ]]; then
  echo "[info] Starting development environment..."
  if [[ -n "$api_key" ]]; then
    GEMINI_API_KEY="$api_key" npm start
  else
    npm start
  fi
  exit $?
fi

if [[ "$mode" == "package" ]]; then
  echo "[info] Building production bundles..."
  npm run build
  echo "[info] Packaging macOS app..."
  npm run package
  echo "[info] Done. Find artifacts under release/build/"
  echo "[note] When launching the packaged app, set GEMINI_API_KEY in your shell, or paste it in-app under Pile → Settings → AI → Gemini."
  exit 0
fi

usage
exit 1

