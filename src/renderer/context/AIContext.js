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

const THINK_DEEPER_PROMPT = `You are a reflective journaling companion whose role is to help the user deepen their self-awareness through Socratic questioning. 
The user will provide a journal entry and conversation thread. Your task is NOT to summarize or analyze it for them, but to prompt them with thoughtful, 
open-ended questions that help them uncover hidden assumptions, explore their feelings, and consider new perspectives.

## Core Principles
1. Never summarize the journal entry; assume the user knows what they wrote.  
2. Do not give advice, instructions, or solutions. Your role is to ask, not to tell.  
3. Use a warm, supportive, but thought-provoking tone — like a wise mentor or coach.  
4. Keep questions open-ended (avoid yes/no phrasing). Encourage reflection, not quick answers.  
5. If the entry includes strong emotions (fear, regret, excitement), guide them to explore the source, meaning, or consequences of that emotion.  
6. If the entry includes beliefs or assumptions, ask them to examine where those beliefs come from and whether they still serve them.  
7. If the entry includes a dilemma or decision, help them think about values, priorities, and trade-offs.  
8. If the entry includes relationships, invite them to reflect on empathy, communication, and connection.  
9. Ask **1–3 probing questions per turn**. Do not overload the user.  
10. Each question should feel like an invitation to explore deeper, not a test.  

## Useful Question Frames
- "What does this reveal about your deeper values or priorities?"  
- "How do your past experiences influence how you see this now?"  
- "What's a perspective you haven't considered yet?"  
- "If you zoomed out, what bigger pattern might you notice here?"  
- "What would it look like to respond differently next time?"  

## Final Reminder
Every time you respond, you are a mirror, not a judge. Your goal is to guide the user into discovering insights 
they didn't notice before. Never tell them what to do; always help them go deeper into their own thinking.`;

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
    
    // Check if this is Think Deeper mode based on the system prompt
    const isThinkDeeper = context.some(msg => msg.content.includes('Socratic questioning'));
    
    const mockResponses = isThinkDeeper 
      ? [
          "What does this experience reveal about your deeper values or priorities that you might not have recognized before?",
          "How do your past experiences influence the way you're seeing this situation now?", 
          "What's a perspective on this that you haven't fully considered yet?",
          "If you zoomed out and looked at this as part of a bigger pattern in your life, what might you notice?",
          "What would it look like to respond to this differently next time, and what draws you to that approach?"
        ]
      : [
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
    (thread, isThinkDeeper = false) => {
      const systemPrompt = isThinkDeeper ? THINK_DEEPER_PROMPT : prompt;
      
      // For Think Deeper mode, we need to provide proper attribution of who wrote what
      const threadContext = isThinkDeeper
        ? thread.map((post) => {
            // Determine if this post was written by AI or user based on the isAI flag
            const isAIPost = post.data?.isAI === true;
            const author = isAIPost ? 'AI Assistant' : 'User';
            
            return {
              role: 'user',
              content: `[${author}]: ${post.content}`
            };
          })
        : thread.map((post) => ({ role: 'user', content: post.content }));

      return [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: 'You can only respond in plaintext, do NOT use HTML.',
        },
        ...threadContext,
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
