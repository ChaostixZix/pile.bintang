# Release Notes

## Migrated to Google Gemini 2.5 Pro
- Replaced OpenAI integration with `@google/generative-ai`.
- Implemented main-process Gemini client with streaming and JSON modes.
- Added secure IPC bridge and renderer hook for streaming.

## Security Improvements
- Enforced strict Content Security Policy via headers (dev/prod variants).
- Verified Electron security flags (contextIsolation on, nodeIntegration off).

## Developer Experience
- Jest mocks for `@google/generative-ai`.
- Unit tests for JSON/stream helpers; integration test for renderer streaming.

## Notes
- Ollama remains supported for local inference.
- Embeddings via OpenAI removed; Ollama embeddings supported; Gemini embedding path is a future enhancement.
