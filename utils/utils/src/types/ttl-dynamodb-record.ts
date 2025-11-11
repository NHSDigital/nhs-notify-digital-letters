import { z } from 'zod';

export const $TtlDynamodbRecord = z.object({
  PK: z.string(),
  SK: z.string(),
  dateOfExpiry: z.string(),
  messageReference: z.string(),
  ttl: z.number(),
  senderId: z.string(),
});

export type TtlDynamodbRecord = z.infer<typeof $TtlDynamodbRecord>;

export type TtlDynamodbRecordKey = Pick<TtlDynamodbRecord, 'PK' | 'SK'>;
