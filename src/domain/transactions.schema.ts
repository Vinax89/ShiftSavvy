import { z } from 'zod';

export const ZTransactionSrc = z.object({
  kind: z.enum(['csv','ofx','manual', 'manualMatch']),
  fileName: z.string().optional(),
  vendor: z.string().optional(),
  externalId: z.string().nullable().optional(), // OFX FITID if present
  sourceHash: z.string(),                        // sha256(base64url) of raw row
  importedAt: z.union([z.string(), z.number()]), // ISO timestamp or millis
  importerVersion: z.string().optional(),
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
  txKey: z.string().optional(), // sha256 of canonical fields
  bnplProvider: z.string().optional(),
  bnplPlanId: z.string().nullable().optional(),
  bnplSequence: z.number().int().optional(),
  possibleDuplicateOf: z.string().nullable().optional(),
});
export type TransactionV2 = z.infer<typeof ZTransactionV2>
