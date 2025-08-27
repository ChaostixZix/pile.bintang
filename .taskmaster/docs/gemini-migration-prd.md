# PRD: Migrate AI Integration to Gemini 2.5 Pro

## Overview
PileBintang is an Electron + React journaling app currently using OpenAI. We will migrate to Google Gemini 2.5 Pro using the official `@google/genai` Node SDK, keeping UX parity (chat, reflect, summaries) with secure key handling.

## Goals
- Replace `openai` with `@google/genai` and set default model to `gemini-2.5-pro`.
- Stream responses to the UI; support JSON/structured output for summarization.
- Keep API key in Electron main (`GEMINI_API_KEY`) and expose minimal IPC.
- Preserve current UI flows and tests; update docs and settings copy.

## Non-Goals
- Fine-tuning or file upload APIs; multimodal inputs beyond text for this phase.
- Rewriting UI/UX beyond necessary wording and error messages.

## User Stories
- As a user, I can paste a Gemini API key and validate it.
- As a writer, I can generate AI responses with live streaming.
- As a researcher, I can request structured JSON summaries reliably.

## Functional Requirements
- Main-process client: `GoogleGenAI(apiKey)`; `getGenerativeModel({ model: 'gemini-2.5-pro' })`.
- IPC: `invoke('gemini:generate')` and event channel for streaming chunks.
- Generation config: temperature/topP/topK; JSON mode via `responseMimeType: 'application/json'`.
- Error handling: network/timeouts, safety blocks, rate-limit backoff; user-friendly toasts.
- Settings: input for Gemini key; read from env when present.

## Architecture / Security
- Electron security: `contextIsolation: true`, `nodeIntegration: false`.
- Preload exposes a narrow API via `contextBridge`; validate IPC senders.
- Never expose or persist the API key in renderer or logs.

## Milestones
1) Spike SDK + streaming in main (1 day)
2) IPC bridge + renderer streaming UI (1–2 days)
3) JSON mode integration for summaries (0.5 day)
4) Settings UI + key validation (0.5 day)
5) Replace OpenAI calls repo-wide (1 day)
6) Tests (unit + happy-path integration) (1 day)
7) Docs and release notes (0.5 day)

## Acceptance Criteria
- `npm test` passes; type-checks clean; lint clean.
- OpenAI package removed; `@google/genai` added; app streams Gemini output.
- JSON summarization returns parseable results or surfaces an error toast.
- Settings persists Gemini key and prevents calls when missing/invalid.
- Security posture matches Electron guidance.

## Risks / Mitigations
- API limits/pricing: add exponential backoff and clear errors.
- Large context: enforce prompt size and truncate safely.
- Streaming differences: adapt UI buffering and completion handling.

## References
- docs/research/gemini-migration-report.md
- https://ai.google.dev/gemini-api/docs/get-started/node
- https://www.electronjs.org/docs/latest/tutorial/security

