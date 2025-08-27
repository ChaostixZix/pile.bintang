import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useElectronStore } from 'renderer/hooks/useElectronStore';
import { usePilesContext } from './PilesContext';

const DEFAULT_PROMPT =
  'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

export const AIContext = createContext();

export function AIContextProvider({ children }) {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [pileAIProvider, setPileAIProvider] = useElectronStore(
    'pileAIProvider',
    'gemini',
  );
  const [model, setModel] = useElectronStore('model', 'gemini-2.5-flash');
  const [useMockAI, setUseMockAI] = useElectronStore('useMockAI', false);
  const setupAi = useCallback(async () => {
    const key = await window.electron.ipc.invoke('get-ai-key');

    if (pileAIProvider === 'gemini') {
      // Gemini integration is handled through IPC, no need for API key validation here
      setAi({ type: 'gemini' });
    } else {
      // Only support Gemini now
      setAi(null);
    }
  }, [pileAIProvider]);

  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIPrompt) setPrompt(currentPile.AIPrompt);
      setupAi();
    }
  }, [currentPile, setupAi]);

  // Mock AI function for testing
  const generateMockCompletion = async (context, callback, options = {}) => {
    const { onStart = () => {}, onError = () => {} } = options;
    console.log('🤖 [AI] Mock AI generation started');
    
    onStart();
    
    const mockResponses = [
      "That's an interesting perspective! Have you considered how this connects to your broader goals and values? Sometimes our thoughts reveal deeper patterns about what truly matters to us.",
      "I notice a thoughtful quality in what you've shared. What draws you to reflect on this particular aspect of your experience right now?",
      "There's something compelling about how you've framed this. How might this thinking evolve if you looked at it from a slightly different angle?",
      "Your reflection touches on something important. What would it mean to lean into this insight more fully in your daily life?",
      "This reminds me of how growth often happens in small, seemingly ordinary moments. What's emerging for you as you sit with these thoughts?"
    ];
    
    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    const words = response.split(' ');
    
    // Simulate streaming by sending words one by one
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // Random delay 100-300ms
      const token = i === 0 ? words[i] : ' ' + words[i];
      callback(token);
      console.log('🤖 [AI] Mock token sent:', token);
    }
    
    console.log('🤖 [AI] Mock AI generation completed');
  };

  const generateCompletion = useCallback(
    async (context, callback, options = {}) => {
      console.log('🤖 [AI] generateCompletion called', { ai, contextLength: context?.length, options, useMockAI });
      
      // Use mock AI if enabled
      if (useMockAI) {
        console.log('🤖 [AI] Using mock AI for testing');
        return await generateMockCompletion(context, callback, options);
      }

      if (!ai) {
        console.error('🤖 [AI] No AI instance available');
        return;
      }

      const { timeout = 30000, onStart = () => {}, onError = () => {} } = options;
      let isCompleted = false;
      let hasReceivedData = false;
      const startTime = Date.now();

      try {
        if (ai.type === 'gemini') {
          // Convert context to a single prompt for Gemini
          const prompt = context
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join('\n\n');

          console.log('🤖 [AI] Starting Gemini request', { 
            promptLength: prompt.length, 
            timeout,
            timestamp: new Date().toISOString()
          });

          onStart();

          // Set up timeout
          const timeoutId = setTimeout(() => {
            if (!isCompleted) {
              console.error('🤖 [AI] Request timed out after', timeout, 'ms');
              isCompleted = true;
              onError(new Error('AI response timed out. Please try again.'));
            }
          }, timeout);

          // Set up stream listener with better error handling
          const cleanup = window.electron.gemini.onGeminiResponse((data) => {
            console.log('🤖 [AI] Received stream data:', data);
            
            if (isCompleted) {
              console.log('🤖 [AI] Ignoring data - already completed');
              return;
            }

            try {
              if (data.type === 'start') {
                console.log('🤖 [AI] Stream started');
                hasReceivedData = true;
              } else if (data.type === 'chunk' && data.data) {
                console.log('🤖 [AI] Received chunk:', data.data.length, 'characters');
                hasReceivedData = true;
                callback(data.data);
              } else if (data.type === 'end') {
                console.log('🤖 [AI] Stream ended successfully');
                isCompleted = true;
                clearTimeout(timeoutId);
              } else if (data.type === 'error') {
                console.error('🤖 [AI] Stream error:', data.error);
                isCompleted = true;
                clearTimeout(timeoutId);
                onError(new Error(data.error || 'AI request failed'));
              }
            } catch (error) {
              console.error('🤖 [AI] Error processing stream data:', error);
              isCompleted = true;
              clearTimeout(timeoutId);
              onError(error);
            }
          });

          try {
            // Start the stream with the selected model
            console.log('🤖 [AI] Calling window.electron.gemini.startStream with model:', model);
            const result = await window.electron.gemini.startStream(prompt, model);
            console.log('🤖 [AI] startStream result:', result);
            
            if (!result || !result.success) {
              throw new Error(result?.error || 'Failed to start AI stream');
            }
          } catch (streamError) {
            console.error('🤖 [AI] Failed to start stream:', streamError);
            isCompleted = true;
            clearTimeout(timeoutId);
            cleanup();
            throw streamError;
          }

          // Wait for completion or timeout
          console.log('🤖 [AI] Waiting for completion...');
          await new Promise((resolve, reject) => {
            const checkCompletion = () => {
              if (isCompleted) {
                const duration = Date.now() - startTime;
                console.log('🤖 [AI] Request completed in', duration, 'ms');
                cleanup();
                resolve();
              } else {
                setTimeout(checkCompletion, 100);
              }
            };
            checkCompletion();
          });
        }
      } catch (error) {
        console.error('AI request failed:', error);
        throw error;
      }
    },
    [ai, model, useMockAI],
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
    [prompt],
  );

  const checkApiKeyValidity = async () => {
    if (pileAIProvider === 'gemini') {
      // For Gemini, check if API key is stored
      try {
        const key = await window.electron.ipc.invoke('get-ai-key');
        return key !== null && key !== undefined && key.trim().length > 0;
      } catch (error) {
        console.warn('Failed to check Gemini API key:', error);
        return false;
      }
    }
    // Default case - no valid provider
    return false;
  };

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
    generateCompletion,
    prepareCompletionContext,
    pileAIProvider,
    setPileAIProvider,
    useMockAI,
    setUseMockAI,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
}

export const useAIContext = () => useContext(AIContext);
