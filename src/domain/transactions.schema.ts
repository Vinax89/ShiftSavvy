import { z } from 'zod';

export const ZTransactionSrc = z.object({
  kind: z.enum(['csv','ofx','manual']),
  fileName: z.string().optional(),
  externalId: z.string().nullable().optional(), // OFX FITID if present
  sourceHash: z.string(),                        // sha256(base64url) of raw row
  importedAt: z.string(),                        // ISO timestamp
  importerVersion: z.string(),
});

export const ZTransactionV2 = z.object({
  userId: z.string(),
  accountId: z.string(),                         // e.g. 'chase:checking:1234'
  postedDate: z.string().length(10).regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/),
  description: z.string(),                       // normalized single-spaced
  amountCents: z.number().int(),                 // negative = debit
  currency: z.literal('USD'),
  notes: z.string().optional(),                  // user-editable
  category: z.string().optional(),               // user-editable
  src: ZTransactionSrc,
  schemaVersion: z.literal(2),
});
export type TransactionV2 = z.infer<typeof ZTransactionV2>
