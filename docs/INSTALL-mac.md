# Install on macOS (Quick Guide)

## Prerequisites
- Node.js 18+ and npm
- A Gemini API key from Google AI Studio

## Run in Development (hot reload)
```bash
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh --dev --api-key="YOUR_GEMINI_KEY"
# Or, export the key in your shell and omit --api-key
# export GEMINI_API_KEY="YOUR_GEMINI_KEY" && ./scripts/setup-mac.sh --dev
```

## Build Production App (macOS .app/.dmg)
```bash
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh --package
open release/build
```
If macOS blocks the app, right‑click the app → Open.

## First‑Run Setup in App
- Pile → Settings → AI → Gemini API
- Model: `gemini-2.5-pro` (default)
- Paste your Gemini API key if not provided via env var

## Troubleshooting
- Missing AI output: ensure `GEMINI_API_KEY` set or paste key in Settings
- Dev CSP/HMR: `./scripts/setup-mac.sh --dev` already enables localhost/ws
- Packaging/signing: unsigned builds may need right‑click → Open
