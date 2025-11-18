import { z } from 'zod';
import { $CloudEvent, $CloudEventData } from './cloud-event';

export const $TtlItemData = $CloudEventData.extend({
  messageUri: z.string().min(1).describe('URI of the TTL item resource'),
});

export type TtlItemEventData = z.infer<typeof $TtlItemData>;

export const $TtlItemEvent = $CloudEvent.extend({
  data: $TtlItemData,
});

export type TtlItemEvent = z.infer<typeof $TtlItemEvent>;

export type TtlItemBusEvent = {
  detail: TtlItemEvent;
};

export const validateTtlItemEvent = (data: unknown) => {
  return $TtlItemEvent.safeParse(data);
};
