import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import useGeminiStream from '../renderer/hooks/useGeminiStream';

// Simple test component to exercise the hook
function StreamTester() {
  const { isStreaming, streamedContent, isComplete, startStream } = useGeminiStream();
  return (
    <div>
      <div data-testid="isStreaming">{String(isStreaming)}</div>
      <div data-testid="isComplete">{String(isComplete)}</div>
      <div data-testid="content">{streamedContent}</div>
      <button onClick={() => startStream('Hello')}>Start</button>
    </div>
  );
}

describe('useGeminiStream integration (renderer)', () => {
  // Store provided callback from onGeminiResponse so tests can emit events
  let storedCallback: ((data: any) => void) | null = null;

  beforeEach(() => {
    storedCallback = null;
    (global as any).window = (global as any).window || {};
    (window as any).electron = {
      gemini: {
        onGeminiResponse: (cb: (data: any) => void) => {
          storedCallback = cb;
          return () => {
            storedCallback = null;
          };
        },
        startStream: async (_prompt: string) => ({ success: true, streamId: 'stream-123', timestamp: new Date().toISOString() }),
        invokeGemini: async (_prompt: string) => ({ success: true, data: { ok: true } }),
        removeAllStreamListeners: () => {},
      },
    };
  });

  it('buffers chunks and completes on end', async () => {
    render(<StreamTester />);

    // Start streaming
    await act(async () => {
      screen.getByText('Start').click();
    });

    expect(screen.getByTestId('isStreaming')).toHaveTextContent('true');

    // Emit start, chunk, end events via stored callback
    await act(async () => {
      storedCallback?.({ type: 'start', streamId: 'stream-123', timestamp: new Date().toISOString() });
    });

    await act(async () => {
      storedCallback?.({ type: 'chunk', streamId: 'stream-123', data: 'Hello ', timestamp: new Date().toISOString() });
      storedCallback?.({ type: 'chunk', streamId: 'stream-123', data: 'World', timestamp: new Date().toISOString() });
    });

    expect(screen.getByTestId('content')).toHaveTextContent('Hello World');

    await act(async () => {
      storedCallback?.({ type: 'end', streamId: 'stream-123', timestamp: new Date().toISOString() });
    });

    expect(screen.getByTestId('isStreaming')).toHaveTextContent('false');
    expect(screen.getByTestId('isComplete')).toHaveTextContent('true');
  });
});

