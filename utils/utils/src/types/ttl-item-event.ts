import { z } from 'zod';
import { $CloudEvent, $CloudEventData } from './cloud-event';

// Extend the existing CloudEvent data schema to add the URI field
export const $TtlItemData = $CloudEventData.extend({
  uri: z.string().min(1).describe('URI of the TTL item resource'),
});

export type TtlItemEventData = z.infer<typeof $TtlItemData>;

// TTL CloudEvent - extends $CloudEvent but with enhanced data that includes URI
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
