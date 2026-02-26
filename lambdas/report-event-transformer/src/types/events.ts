import { z } from 'zod';

export const $DigitalLettersEvent = z.object({
  data: z.object({
    messageReference: z.string(),
    pageCount: z.number().optional(),
    reasonCode: z.string().optional(),
    reasonText: z.string().optional(),
    senderId: z.string(),
    supplierId: z.string().optional(),
    status: z.string().optional(),
  }),
  time: z.string(),
  type: z.string(),
});

export type DigitalLettersEvent = z.infer<typeof $DigitalLettersEvent>;

export type FlatDigitalLettersEvent = {
  messageReference: string;
  pageCount?: number;
  senderId: string;
  supplierId?: string;
  letterStatus?: string;
  reasonCode?: string;
  reasonText?: string;
  time: string;
  type: string;
};

// Custom type similar to FirehoseTransformationResultRecord from aws-lambda,
// but with strict metadata typing for dynamic partitioning keys
export type ReportEvent = {
  recordId: string;
  data: string;
  result: 'Ok' | 'Dropped' | 'ProcessingFailed';
  metadata: {
    partitionKeys: {
      year: string;
      month: string;
      day: string;
      senderId: string;
    };
  };
};
