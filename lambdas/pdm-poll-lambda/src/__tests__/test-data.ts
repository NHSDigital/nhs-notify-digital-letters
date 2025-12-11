import { SQSEvent, SQSRecord } from 'aws-lambda';
import { CloudEvent } from 'utils';

const baseEvent = {
  profileversion: '1.0.0',
  profilepublished: '2025-10',
  id: '550e8400-e29b-41d4-a716-446655440001',
  specversion: '1.0',
  source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
  subject:
    'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
  type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
  dataschemaversion: '1.0',
  severitytext: 'INFO',
  data: {
    resourceId: 'a2bcbb42-ab7e-42b6-88d6-74f8d3ca4a09',
    'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
    messageReference: 'ref1',
    senderId: 'sender1',
  },
};

export const pdmResourceSubmittedEvent = {
  ...baseEvent,
  type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
} as CloudEvent;

export const pdmResourceUnavailableEvent = {
  ...baseEvent,
  type: 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
  data: {
    ...baseEvent.data,
    retryCount: 1,
  },
} as CloudEvent;

const busEvent = {
  version: '0',
  id: 'ab07d406-0797-e919-ff9b-3ad9c5498114',
};

const sqsRecord = {
  messageId: '1',
  receiptHandle: 'abc',
  attributes: {
    ApproximateReceiveCount: '1',
    SentTimestamp: '2025-07-03T14:23:30Z',
    SenderId: 'sender-id',
    ApproximateFirstReceiveTimestamp: '2025-07-03T14:23:30Z',
  },
  messageAttributes: {},
  md5OfBody: '',
  eventSource: 'aws:sqs',
  eventSourceARN: '',
  awsRegion: '',
} as SQSRecord;

export const recordEvent = (events: CloudEvent[]): SQSEvent => ({
  Records: events.map((event, i) => ({
    ...sqsRecord,
    messageId: String(i + 1),
    body: JSON.stringify({ ...busEvent, detail: event }),
  })),
});
