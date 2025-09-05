export async function sha256Base64Url(input: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  const b64 = createHash('sha256').update(input).digest('base64')
  const t = b64.replace(/\+/g,'-').replace(/\//g,'_')
  return t.split('=')[0]
}
