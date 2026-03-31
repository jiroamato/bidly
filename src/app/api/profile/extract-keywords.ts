const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "our", "we", "you", "your",
  "their", "its", "his", "her", "this", "that", "these", "those", "it",
  "not", "no", "also", "including", "such", "as",
]);

const KNOWN_ACRONYMS = new Set(["it", "ai", "ml", "hr", "qa", "ui", "ux"]);

export function extractKeywordsFromCapabilities(
  capabilities: string
): string[] {
  if (!capabilities) return [];

  const phrases = capabilities
    .split(/,|\band\b|including|such as|also|our core|services include/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const words: string[] = [];
  for (const phrase of phrases) {
    const tokens = phrase
      .replace(/-/g, " ")
      .replace(/[^\w\s]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    words.push(...tokens);
  }

  const filtered = words.filter((w) => {
    if (STOP_WORDS.has(w)) return false;
    if (w.length <= 2 && !KNOWN_ACRONYMS.has(w)) return false;
    return true;
  });

  return [...new Set(filtered)].slice(0, 50);
}
