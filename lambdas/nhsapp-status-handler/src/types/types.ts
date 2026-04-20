import { z } from 'zod';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';

export const $ChannelStatusPublishedEvent = z.object({
  data: z.object({
    messageReference: z.string(),
    supplierStatus: z.literal('PaperLetterOptedOut'),
  }),
});

export type ChannelStatusPublishedEvent = z.infer<
  typeof $ChannelStatusPublishedEvent
>;

export type TtlRecord = {
  event: MESHInboxMessageDownloaded;
};
