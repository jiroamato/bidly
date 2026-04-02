import { NextRequest, NextResponse } from "next/server";

/**
 * Simple API key gate for /api/* routes.
 * Set API_SECRET_KEY in your Vercel env vars, and
 * NEXT_PUBLIC_API_KEY to the same value so the browser can send it.
 *
 * When API_SECRET_KEY is not set (local dev), all requests pass through.
 */
export function middleware(request: NextRequest) {
  const secret = process.env.API_SECRET_KEY;

  // No secret configured — skip check (local dev)
  if (!secret) return NextResponse.next();

  const provided =
    request.headers.get("x-api-key") ??
    request.nextUrl.searchParams.get("apiKey");

  if (provided === secret) return NextResponse.next();

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: "/api/:path*",
};
