const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

async function callVoyageAPI(input: string[]): Promise<{ embedding: number[] }[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input, model: "voyage-3" }),
  });

  if (!res.ok) {
    throw new Error(`Voyage API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.data;
}

export async function embedText(text: string): Promise<number[]> {
  const data = await callVoyageAPI([text]);
  return data[0].embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 128;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const data = await callVoyageAPI(batch);
    for (const item of data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
