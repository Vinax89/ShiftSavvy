import { NextResponse } from 'next/server';
import { cachedFetchJSON } from '@/lib/cachedFetch.server';

export const runtime = 'nodejs'; // ensure Node runtime

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo') || 'vercel/next.js';

  try {
    const data = await cachedFetchJSON(
      `https://api.github.com/repos/${repo}`,
      {
        ttl: 60_000, // 1 minute cache
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ShiftSavvy-App',
        },
      }
    );
    return NextResponse.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // The error from cachedFetchJSON is already quite descriptive.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
