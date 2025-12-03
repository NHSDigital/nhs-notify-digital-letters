import { z } from 'zod';
import { $CloudEvent, $CloudEventData } from './cloud-event';

export const $TtlItemData = $CloudEventData.extend({
  messageUri: z.string().min(1).describe('URI of the TTL item resource'),
});

export type TtlItemEventData = z.infer<typeof $TtlItemData>;

export const $TtlItemEvent = $CloudEvent.extend({
  data: $TtlItemData,
});

export const $TtlItemBusEvent = z.object({
  detail: $TtlItemEvent,
});

export type TtlItemEvent = z.infer<typeof $TtlItemEvent>;

export type TtlItemBusEvent = z.infer<typeof $TtlItemBusEvent>;

export const validateTtlItemEvent = (data: unknown) => {
  return $TtlItemEvent.safeParse(data);
};

export const $PdmResourceSubmittedData = $CloudEventData.extend({
  resourceId: z.string(),
  retryCount: z.number(),
});

export const $PdmResourceSubmittedEvent = $CloudEvent.extend({
  data: $PdmResourceSubmittedData,
});

export type PdmResourceSubmittedEvent = z.infer<
  typeof $PdmResourceSubmittedEvent
>;

export const $PdmResourceRejectedEvent = $CloudEvent.extend({
  data: $CloudEventData,
});

export type PdmResourceRejectedEvent = z.infer<
  typeof $PdmResourceRejectedEvent
>;
