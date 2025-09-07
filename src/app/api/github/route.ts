import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // ensure Node runtime

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo') || 'vercel/next.js';

  try {
    // NOTE: This is a direct fetch. Caching can be added later.
    const res = await fetch(
      `https://api.github.com/repos/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ShiftSavvy-App',
        },
        // Revalidate every 60 seconds
        next: { revalidate: 60 }
      }
    );

    if (!res.ok) {
        const errorData = await res.json();
        return NextResponse.json({ error: errorData.message || 'Failed to fetch from GitHub' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
