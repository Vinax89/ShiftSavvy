export async function sha256Base64(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const enc = new TextEncoder().encode(input)
    const buf = await window.crypto.subtle.digest('SHA-256', enc)
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
  } else {
    const { createHash } = await import('node:crypto')
    return createHash('sha256').update(input).digest('base64')
  }
}
