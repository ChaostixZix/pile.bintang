import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { usePilesContext } from './PilesContext';
import { useElectronStore } from 'renderer/hooks/useElectronStore';

const OLLAMA_URL = 'http://localhost:11434/api';
const DEFAULT_PROMPT =
  'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [pileAIProvider, setPileAIProvider] = useElectronStore(
    'pileAIProvider',
    'gemini'
  );
  const [model, setModel] = useElectronStore('model', 'gemini-2.5-pro');
  const [embeddingModel, setEmbeddingModel] = useElectronStore(
    'embeddingModel',
    'mxbai-embed-large'
  );
  // Base URL no longer used for Gemini; kept for Ollama only

  const setupAi = useCallback(async () => {
    const key = await window.electron.ipc.invoke('get-ai-key');
    
    if (pileAIProvider === 'gemini') {
      // Gemini integration is handled through IPC, no need for API key validation here
      setAi({ type: 'gemini' });
    } else if (pileAIProvider === 'ollama') {
      setAi({ type: 'ollama' });
    } else {
      // Disable legacy OpenAI fallback
      setAi(null);
    }
  }, [pileAIProvider]);

  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIPrompt) setPrompt(currentPile.AIPrompt);
      setupAi();
    }
  }, [currentPile, baseUrl, setupAi]);

  const generateCompletion = useCallback(
    async (context, callback) => {
      if (!ai) return;

      try {
        if (ai.type === 'gemini') {
          // Convert context to a single prompt for Gemini
          const prompt = context.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
          
          // Set up stream listener
          const cleanup = window.electron.gemini.onGeminiResponse((data) => {
            if (data.type === 'chunk' && data.data) {
              callback(data.data);
            }
          });

          try {
            // Start the stream
            await window.electron.gemini.startStream(prompt);
          } finally {
            // Clean up the listener
            cleanup();
          }
        } else if (ai.type === 'ollama') {
          const response = await fetch(`${OLLAMA_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: context }),
          });

          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() !== '') {
                const jsonResponse = JSON.parse(line);
                if (!jsonResponse.done) {
                  callback(jsonResponse.message.content);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('AI request failed:', error);
        throw error;
      }
    },
    [ai, model]
  );

  const prepareCompletionContext = useCallback(
    (thread) => {
      return [
        { role: 'system', content: prompt },
        {
          role: 'system',
          content: 'You can only respond in plaintext, do NOT use HTML.',
        },
        ...thread.map((post) => ({ role: 'user', content: post.content })),
      ];
    },
    [prompt]
  );

  const checkApiKeyValidity = async () => {
    if (pileAIProvider === 'gemini') {
      // For Gemini, API key validation is handled by the main process
      // We can test this by making a simple completion request
      try {
        const response = await window.electron.gemini.invokeGemini('Hello');
        return response.success;
      } catch (error) {
        console.warn('Gemini API key validation failed:', error);
        return false;
      }
    } else if (pileAIProvider === 'ollama') {
      // Ollama doesn't require API key
      return true;
    }
  }

  const AIContextValue = {
    ai,
    prompt,
    setPrompt,
    setKey: (secretKey) => window.electron.ipc.invoke('set-ai-key', secretKey),
    getKey: () => window.electron.ipc.invoke('get-ai-key'),
    validKey: checkApiKeyValidity,
    deleteKey: () => window.electron.ipc.invoke('delete-ai-key'),
    updateSettings: (newPrompt) =>
      updateCurrentPile({ ...currentPile, AIPrompt: newPrompt }),
    model,
    setModel,
    embeddingModel,
    setEmbeddingModel,
    generateCompletion,
    prepareCompletionContext,
    pileAIProvider,
    setPileAIProvider,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
