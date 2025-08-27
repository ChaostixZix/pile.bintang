import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for handling Gemini AI streaming responses
 * Provides buffered streaming, status management, and error handling
 */
const useGeminiStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  // Track current stream for cancellation
  const currentStreamId = useRef(null);
  const cleanupFunctionRef = useRef(null);
  const bufferRef = useRef('');

  // Handle stream events from Gemini
  const handleStreamEvent = useCallback((data) => {
    // Only process events for the current stream
    if (!currentStreamId.current || data.streamId !== currentStreamId.current) {
      return;
    }

    switch (data.type) {
      case 'start':
        setIsStreaming(true);
        setError(null);
        setIsComplete(false);
        bufferRef.current = '';
        setStreamedContent('');
        break;

      case 'chunk':
        if (data.data) {
          bufferRef.current += data.data;
          // Use debounced updates to avoid excessive re-renders
          setStreamedContent(bufferRef.current);
        }
        break;

      case 'end':
        setIsStreaming(false);
        setIsComplete(true);
        setStreamedContent(bufferRef.current);
        currentStreamId.current = null;
        break;

      case 'error':
        setIsStreaming(false);
        setError(new Error(data.error || 'Stream error occurred'));
        setIsComplete(true);
        currentStreamId.current = null;
        break;

      default:
        console.warn('Unknown stream event type:', data.type);
    }
  }, []);

  // Start a new stream
  const startStream = useCallback(
    async (prompt) => {
      try {
        // Cancel any existing stream
        if (currentStreamId.current) {
          cancelStream();
        }

        // Reset state
        setIsStreaming(true);
        setError(null);
        setIsComplete(false);
        setStreamedContent('');
        bufferRef.current = '';

        // Set up stream listener
        const cleanup =
          window.electron.gemini.onGeminiResponse(handleStreamEvent);
        cleanupFunctionRef.current = cleanup;

        // Start the stream
        const response = await window.electron.gemini.startStream(prompt);

        if (response.success) {
          currentStreamId.current = response.streamId;
        } else {
          setError(new Error(response.error || 'Failed to start stream'));
          setIsStreaming(false);
          setIsComplete(true);
        }
      } catch (err) {
        console.error('Failed to start Gemini stream:', err);
        setError(err);
        setIsStreaming(false);
        setIsComplete(true);
      }
    },
    [handleStreamEvent],
  );

  // Cancel the current stream
  const cancelStream = useCallback(() => {
    if (currentStreamId.current) {
      currentStreamId.current = null;
      setIsStreaming(false);
      setIsComplete(true);
    }

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }
  }, []);

  // Generate JSON completion (non-streaming)
  const generateCompletion = useCallback(async (prompt) => {
    try {
      setError(null);
      const response = await window.electron.gemini.invokeGemini(prompt);

      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to generate completion');
    } catch (err) {
      console.error('Failed to generate Gemini completion:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    cancelStream();
    setStreamedContent('');
    setError(null);
    setIsComplete(false);
    bufferRef.current = '';
  }, [cancelStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  return {
    // State
    isStreaming,
    streamedContent,
    error,
    isComplete,

    // Actions
    startStream,
    cancelStream,
    generateCompletion,
    reset,
  };
};

export default useGeminiStream;
