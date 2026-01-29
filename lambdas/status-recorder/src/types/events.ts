import { z } from 'zod';

export const $DigitalLettersEvent = z.object({
  data: z.object({
    messageReference: z.string(),
    senderId: z.string(),
    pageCount: z.number().optional(),
    supplierId: z.string().optional(),
  }),
  time: z.string(),
  type: z.string(),
});

export const $FlatDigitalLettersEvent = z.object({
  messageReference: z.string(),
  senderId: z.string(),
  pageCount: z.number().optional(),
  supplierId: z.string().optional(),
  time: z.string(),
  type: z.string(),
});

// Custom type similar to FirehoseTransformationResultRecord from aws-lambda,
// but with strict metadata typing for dynamic partitioning keys
export const $ReportEvent = z.object({
  recordId: z.string(),
  data: z.string(),
  result: z.enum(['Ok', 'Dropped', 'ProcessingFailed']),
  metadata: z.object({
    partitionKeys: z.object({
      year: z.string(),
      month: z.string(),
      day: z.string(),
      senderId: z.string(),
    }),
  }),
});

export type DigitalLettersEvent = z.infer<typeof $DigitalLettersEvent>;

export type FlatDigitalLettersEvent = z.infer<typeof $FlatDigitalLettersEvent>;

export type ReportEvent = z.infer<typeof $ReportEvent>;
