# Gemini 2.5 Pro Integration Research (Electron + React + TypeScript)

This report was generated with `gemini` CLI using web_search.

## Summary
Integrating Gemini 2.5 Pro is best via the official `@google/genai` Node SDK. Keep the API key in Electron’s main process and communicate with the renderer through a minimal preload bridge. Gemini 2.5 Pro supports streaming, JSON responses, safety controls, large context windows, and multimodal inputs.

## Recommendations
- Use `@google/genai` over raw REST unless minimizing deps.
- Store `GEMINI_API_KEY` only in main; never expose to renderer.
- Use `ipcMain`/`contextBridge` for a narrow, validated API.
- Default model: `gemini-2.5-pro`; enable streaming where UX benefits.

## Code Snippets

Client initialization (main process):

```ts
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
```

Streaming text generation (main process, send chunks to renderer via IPC):

```ts
async function streamChatResponse(prompt: string, sendToRenderer: (chunk: string) => void) {
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    sendToRenderer(chunk.text());
  }
}
```

JSON mode (structured output):

```ts
async function getJsonResponse(prompt: string) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const res = await model.generateContent(prompt);
  const text = res.response.text();
  try { return JSON.parse(text); } catch { return null; }
}
```

## Electron Security Notes
- Enable `contextIsolation`; disable `nodeIntegration`.
- Validate sender origins and sanitize inputs.
- Restrict CSP.

## OpenAI → Gemini Migration Notes
- Package: replace `openai` with `@google/genai`.
- Client init: `new OpenAI({ apiKey })` → `new GoogleGenAI(apiKey)`.
- Calls: `chat.completions.create(...)` → `model.generateContent(...)` or `generateContentStream(...)`.
- Prompt shape: OpenAI `messages[]` → Gemini `contents[{ role, parts: [{ text }] }]`.
- Parameters: temperature/topP/topK available; JSON via `responseMimeType: 'application/json'`.

## Migration Steps
1. Uninstall OpenAI and install Gemini SDK.
2. Initialize client in Electron main; configure model `gemini-2.5-pro`.
3. Add secure IPC endpoints and preload bridge; validate senders.
4. Replace API calls in services/contexts with Gemini equivalents.
5. Implement streaming and JSON workflows; update UI handlers.
6. Add tests for happy-path generation, streaming, and JSON parsing.
7. Update docs and settings; verify Electron security.

## References
- Google Generative AI JS SDK: https://github.com/google/generative-ai-js
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- Gemini Models: https://ai.google.dev/models/gemini
- Gemini Pricing: https://ai.google.dev/pricing
- Node Quickstart: https://ai.google.dev/gemini-api/docs/get-started/node
