// Compatibility shim for existing imports.
// Avoids statically importing 'node:crypto' so client bundles stay clean.
// Prefer using explicit '@/domain/hash-server' or '@/domain/hash-client' in new code.
export async function sha256(input: string) {
  if (typeof window === 'undefined') {
    const { createHash } = await import('node:crypto')
    return createHash('sha256').update(input).digest('hex')
  }
  const enc = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
'use client';

// Browser-side: Web Crypto API
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
