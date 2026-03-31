import { VoyageAIClient } from "voyageai";

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

export async function embedText(text: string): Promise<number[]> {
  const result = await voyage.embed({
    input: [text],
    model: "voyage-3",
  });
  return result.data![0].embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 128;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await voyage.embed({
      input: batch,
      model: "voyage-3",
    });
    for (const item of result.data!) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
