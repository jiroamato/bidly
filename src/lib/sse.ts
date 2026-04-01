/**
 * Consume an SSE stream, calling onChunk for each parsed text chunk.
 * Updates are batched to requestAnimationFrame (~60fps) so the UI
 * doesn't re-render on every single token.
 * Returns the fully accumulated text.
 */
export async function consumeSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (accumulated: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let done = false;
  let rafPending = false;

  function scheduleFlush() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      onChunk(fullText);
    });
  }

  while (!done) {
    const result = await reader.read();
    if (result.done) break;

    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          done = true;
          break;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            fullText += parsed.text;
            scheduleFlush();
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  // Final flush to ensure last tokens are rendered
  onChunk(fullText);
  return fullText;
}
