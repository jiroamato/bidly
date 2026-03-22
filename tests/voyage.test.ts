import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEmbeddings } from "../src/lib/voyage";

describe("getEmbeddings", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn());
    process.env.VOYAGE_API_KEY = "test-key";
  });

  it("throws if VOYAGE_API_KEY is not set", async () => {
    delete process.env.VOYAGE_API_KEY;
    await expect(getEmbeddings(["test"])).rejects.toThrow(
      "VOYAGE_API_KEY environment variable is not set"
    );
  });

  it("calls Voyage API with correct payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2] }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getEmbeddings(["hello world"]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.voyageai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-key",
        },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input).toEqual(["hello world"]);
    expect(body.model).toBe("voyage-3-lite");
  });

  it("passes input_type when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [0.1] }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getEmbeddings(["text"], "voyage-3-lite", "document");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input_type).toBe("document");
  });

  it("omits input_type when not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [0.1] }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getEmbeddings(["text"]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input_type).toBeUndefined();
  });

  it("returns embeddings from response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
      }),
    }));

    const result = await getEmbeddings(["text1", "text2"]);
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
  });

  it("throws on non-ok response with status and body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    }));

    await expect(getEmbeddings(["text"])).rejects.toThrow(
      "Voyage API error: 401 Unauthorized"
    );
  });
});
