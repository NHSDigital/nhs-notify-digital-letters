// Manual Zod schema for Digital Letters CloudEvent
// Based on digital-letters.schema.yaml

import { z } from 'zod';

export const $CloudEventData = z
  .object({
    'digital-letter-id': z
      .uuid()
      .describe('The unique identifier for the digital letter.'),
  })
  .catchall(z.any());

export type Data = z.infer<typeof $CloudEventData>;

const $CloudEventBase = z.object({
  id: z.string(),
  specversion: z.string(),
  plane: z.string(),
  time: z.iso.datetime(),
  datacontenttype: z.string(),
  dataschemaversion: z.string(),
});

export const $CloudEvent = $CloudEventBase.extend({
  source: z
    .string()
    .regex(
      /^\/nhs\/england\/notify\/(production|staging|development|uat)\/(primary|secondary|dev-\d+)\/data-plane\/digital-letters$/,
      'Source must match the digital letters pattern',
    )
    .describe('Event source for digital letters domain'),

  subject: z
    .string()
    .regex(
      /^customer\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/recipient\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      'Subject must be in the format customer/{uuid}/recipient/{uuid}',
    )
    .describe(
      'Path in the form customer/{id}/recipient/{id} where each {id} is a UUID',
    ),

  type: z
    .string()
    .regex(
      /^uk\.nhs\.notify\.digital\.letters\.[a-z]+\.v\d+$/,
      'Type must follow the digital letters event type pattern',
    )
    .describe('Concrete versioned event type string'),

  dataschema: z
    .literal(
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    )
    .describe('Canonical URI of the event data schema'),

  data: $CloudEventData.describe('Digital letters payload'),
});

export type CloudEvent = z.infer<typeof $CloudEvent>;

export const validateCloudEvent = (data: unknown) => {
  return $CloudEvent.safeParse(data);
};
