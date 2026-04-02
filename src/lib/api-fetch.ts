/**
 * Thin wrapper around fetch that injects the x-api-key header
 * when NEXT_PUBLIC_API_KEY is set.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey) return fetch(input, init);

  const headers = new Headers(init?.headers);
  if (!headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }
  return fetch(input, { ...init, headers });
}
