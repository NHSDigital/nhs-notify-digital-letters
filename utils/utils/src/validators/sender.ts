import { z } from 'zod';

export const $Sender = z.object({
  senderId: z
    .string()
    .min(5)
    .max(255)
    .regex(/^[\w-]+$/),
  senderName: z.string(),
  meshMailboxSenderId: z.string(),
  meshMailboxReportsId: z.string(),
  fallbackWaitTimeSeconds: z.number().positive().int(),
  routingConfigId: z.string().optional(),
});
