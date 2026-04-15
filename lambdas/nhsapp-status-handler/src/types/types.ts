import { z } from 'zod';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';

export const $NhsAppStatus = z.object({
  data: z.object({
    messageReference: z.string(),
    supplierStatus: z.literal('PaperLetterOptedOut'),
  }),
});

export type NhsAppStatus = z.infer<typeof $NhsAppStatus>;

export type TtlRecord = {
  event: MESHInboxMessageDownloaded;
};
