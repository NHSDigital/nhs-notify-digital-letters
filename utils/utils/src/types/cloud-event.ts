// Zod schema for Digital Letters CloudEvent

import { z } from 'zod';

export const $CloudEventData = z
  .object({
    'digital-letter-id': z
      .string()
      .regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      )
      .describe('The unique identifier for the digital letter.'),
    messageReference: z
      .string()
      .describe('The message reference from the sender.'),
    senderId: z.string().describe('The identifier of the message sender.'),
  })
  .catchall(z.any());

export type Data = z.infer<typeof $CloudEventData>;

const $CloudEventBase = z.object({
  profileversion: z
    .literal('1.0.0')
    .describe('NHS Notify CloudEvents profile semantic version'),
  profilepublished: z
    .literal('2025-10')
    .describe('NHS Notify CloudEvents profile publication date'),
  specversion: z.literal('1.0').describe('CloudEvents specification version'),
  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    )
    .describe('Unique identifier for this event instance (UUID)'),
  time: z.iso
    .datetime()
    .describe('Timestamp when the event occurred (RFC 3339)'),
  recordedtime: z.iso
    .datetime()
    .describe('Timestamp when the event was recorded/persisted'),
  severitynumber: z
    .number()
    .min(0)
    .max(5)
    .describe(
      'Numeric severity (TRACE=0, DEBUG=1, INFO=2, WARN=3, ERROR=4, FATAL=5)',
    ),
  traceparent: z
    .string()
    .regex(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/)
    .describe('W3C Trace Context traceparent header value'),
  datacontenttype: z
    .literal('application/json')
    .optional()
    .describe('Media type for the data field'),
  dataschemaversion: z
    .string()
    .optional()
    .describe('Version of the data schema'),
  severitytext: z
    .enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'])
    .optional()
    .describe('Log severity level name'),
  tracestate: z
    .string()
    .optional()
    .describe('Optional W3C Trace Context tracestate header value'),
  partitionkey: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .describe('Partition / ordering key'),
  sequence: z
    .string()
    .regex(/^\d{20}$/)
    .optional()
    .describe('Zero-padded 20 digit numeric sequence'),
  sampledrate: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Sampling factor: number of similar occurrences this event represents',
    ),
  dataclassification: z
    .enum(['public', 'internal', 'confidential', 'restricted'])
    .optional()
    .describe('Data sensitivity classification'),
  dataregulation: z
    .enum(['GDPR', 'HIPAA', 'PCI-DSS', 'ISO-27001', 'NIST-800-53', 'CCPA'])
    .optional()
    .describe('Regulatory regime tag'),
  datacategory: z
    .enum(['non-sensitive', 'standard', 'sensitive', 'special-category'])
    .optional()
    .describe('Data category classification'),
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
      /^uk\.nhs\.notify\.digital\.letters\.[a-z0-9]+(?:\.[a-z0-9]+)*\.v\d+$/,
      'Type must follow the digital letters event type pattern',
    )
    .describe('Concrete versioned event type string'),

  dataschema: z
    .literal(
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
    )
    .describe('Canonical URI of the event data schema'),

  data: $CloudEventData.describe('Digital letters payload'),
});

export type CloudEvent = z.infer<typeof $CloudEvent>;

export const validateCloudEvent = (data: unknown) => {
  return $CloudEvent.safeParse(data);
};
