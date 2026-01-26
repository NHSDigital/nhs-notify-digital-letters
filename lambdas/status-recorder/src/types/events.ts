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

export const $ReportEvent = z.object({
  messageReference: z.string(),
  senderId: z.string(),
  pageCount: z.number().optional(),
  supplierId: z.string().optional(),
  time: z.string(),
  type: z.string(),
});

export type DigitalLettersEvent = z.infer<typeof $DigitalLettersEvent>;

export type ReportEvent = z.infer<typeof $ReportEvent>;
