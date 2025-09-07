
'use server';

import { createHash } from 'node:crypto';

export async function sha256Base64(input: string): Promise<string> {
  return createHash('sha256').update(input).digest('base64');
}
