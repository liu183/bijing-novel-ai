/**
 * SSE Stream Parsing Utility
 *
 * Provides both a real-time async generator (`streamSSE`) for live streaming
 * and a batch collector (`parseSSEStream`) for collecting all messages.
 */

export interface SSEMessage {
  type: 'content' | 'error' | 'done';
  data: string;
}

/**
 * Real-time async generator that yields SSE messages as they arrive.
 * Use with `for await (const msg of streamSSE(response)) { ... }`
 */
export async function* streamSSE(response: Response): AsyncGenerator<SSEMessage> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done', data: '' };
          } else {
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content') {
                yield { type: 'content', data: parsed.data || '' };
              } else if (parsed.type === 'error') {
                yield { type: 'error', data: parsed.data || data };
              } else {
                // Treat unknown parsed types as content
                yield { type: 'content', data: parsed.content || parsed.text || parsed.data || data };
              }
            } catch {
              // Not valid JSON — yield as plain content
              yield { type: 'content', data };
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Batch collector: reads the entire SSE stream and returns all messages.
 * Useful when you need all messages at once rather than processing them in real-time.
 */
export async function parseSSEStream(response: Response): Promise<SSEMessage[]> {
  const messages: SSEMessage[] = [];
  for await (const msg of streamSSE(response)) {
    messages.push(msg);
  }
  return messages;
}
