/**
 * Consume an SSE stream, calling onChunk for each parsed text chunk.
 * Uses requestAnimationFrame to batch updates for smooth rendering.
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
  let rafScheduled = false;

  const flush = () => {
    rafScheduled = false;
    onChunk(fullText);
  };

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
            if (!rafScheduled) {
              rafScheduled = true;
              requestAnimationFrame(flush);
            }
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  // Final flush to ensure all text is rendered
  onChunk(fullText);
  return fullText;
}
