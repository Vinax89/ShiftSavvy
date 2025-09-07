'use server';

// This utility is for server-components only.
// It leverages the built-in caching of Next.js's `fetch` function.

type FetchOptions = RequestInit & {
  ttl?: number;
};

export async function cachedFetchJSON<T = any>(
  url: string,
  opts: FetchOptions = {}
): Promise<T> {
  const { ttl, ...init } = opts;

  const res = await fetch(
    url,
    {
      ...init,
      next: {
        // ttl is in seconds for Next.js fetch cache
        revalidate: ttl ? Math.floor(ttl / 1000) : undefined,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}\n${text.slice(0, 500)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  // This is unexpected for a JSON fetch utility, but we'll handle it.
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse response as JSON from ${url}`);
  }
}
