import { z } from 'zod';

export const $TtlDynamodbRecord = z.object({
  PK: z.string(),
  SK: z.string(),
  dateOfExpiry: z.string(),
  ttl: z.number(),
  event: z.looseObject({}),
  withdrawn: z.boolean().optional(),
});

export type TtlDynamodbRecord = z.infer<typeof $TtlDynamodbRecord>;

export type TtlDynamodbRecordKey = Pick<TtlDynamodbRecord, 'PK' | 'SK'>;
