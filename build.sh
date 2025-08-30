#!/usr/bin/env bash
set -euo pipefail

# Simple macOS build script for Pile
# - Builds production bundles (main + renderer)
# - Packages a signed/notarized mac app if signing creds exist, otherwise unsigned
#
# Usage:
#   ./build.sh                # build for mac (x64 + arm64 if available)
#   ./build.sh --arm64        # build only arm64
#   ./build.sh --x64          # build only x64
#   ./build.sh --unsigned     # skip code signing / notarization

ROOT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$ROOT_DIR"

if [[ $(uname -s) != "Darwin" ]]; then
  echo "[warn] This script is intended to run on macOS (Darwin). Proceeding anyway..." >&2
fi

ARCH_ARGS=()
SKIP_SIGN="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --arm64) ARCH_ARGS+=("--arm64"); shift ;;
    --x64)   ARCH_ARGS+=("--x64")  ; shift ;;
    --unsigned) SKIP_SIGN="true"   ; shift ;;
    *) echo "[error] Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Default to both architectures if none specified
if [[ ${#ARCH_ARGS[@]} -eq 0 ]]; then
  ARCH_ARGS=("--arm64" "--x64")
fi

echo "[info] Ensuring dependencies"
if [[ -d node_modules ]]; then
  echo "[info] node_modules present, skipping install"
else
  if command -v npm &>/dev/null; then
    if [[ -f package-lock.json ]]; then
      npm ci
    else
      npm install
    fi
  else
    echo "[error] npm is required" >&2
    exit 1
  fi
fi

echo "[info] Building production bundles (main + renderer)"
npm run build

# electron-builder config is defined in package.json under "build"
EB_ARGS=("--mac" "--publish" "never" "${ARCH_ARGS[@]}")

if [[ "$SKIP_SIGN" == "true" ]]; then
  echo "[info] Building unsigned (skip signing / notarization)"
  export CSC_IDENTITY_AUTO=false
  export SKIP_NOTARIZE=1
fi

echo "[info] Packaging with electron-builder: ${EB_ARGS[*]}"
npx electron-builder build "${EB_ARGS[@]}"

echo "[done] Artifacts available in the 'dist/' directory"
