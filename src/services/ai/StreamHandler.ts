import { StreamHandler } from './types';

export class StreamParser {
  /**
   * Parse Server-Sent Events (SSE) stream from a Response body.
   */
  static async parseSSE(
    response: Response,
    handler: StreamHandler,
    extractToken: (dataJson: any) => string | null,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body stream is not readable.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    try {
      while (true) {
        if (abortSignal?.aborted) {
          await reader.cancel();
          throw new DOMException('Generation stopped by user.', 'AbortError');
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const token = extractToken(parsed);
              if (token) {
                accumulatedText += token;
                handler.onToken(token);
              }
            } catch {
              // Ignore line if not valid JSON
            }
          }
        }
      }

      // Flush any remaining buffer
      if (buffer.trim().startsWith('data:')) {
        const dataStr = buffer.trim().slice(5).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            const token = extractToken(parsed);
            if (token) {
              accumulatedText += token;
              handler.onToken(token);
            }
          } catch {
            // Ignore
          }
        }
      }

      handler.onComplete(accumulatedText);
      return accumulatedText;
    } catch (err: any) {
      if (err.name === 'AbortError' || abortSignal?.aborted) {
        handler.onComplete(accumulatedText);
        return accumulatedText;
      }
      handler.onError(err);
      throw err;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse Newline Delimited JSON (NDJSON) stream (used by Ollama).
   */
  static async parseNDJSON(
    response: Response,
    handler: StreamHandler,
    extractToken: (dataJson: any) => string | null,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body stream is not readable.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    try {
      while (true) {
        if (abortSignal?.aborted) {
          await reader.cancel();
          throw new DOMException('Generation stopped by user.', 'AbortError');
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            const token = extractToken(parsed);
            if (token) {
              accumulatedText += token;
              handler.onToken(token);
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          const token = extractToken(parsed);
          if (token) {
            accumulatedText += token;
            handler.onToken(token);
          }
        } catch {
          // Ignore
        }
      }

      handler.onComplete(accumulatedText);
      return accumulatedText;
    } catch (err: any) {
      if (err.name === 'AbortError' || abortSignal?.aborted) {
        handler.onComplete(accumulatedText);
        return accumulatedText;
      }
      handler.onError(err);
      throw err;
    } finally {
      reader.releaseLock();
    }
  }
}
