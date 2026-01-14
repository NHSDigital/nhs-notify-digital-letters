import { SQSEvent, SQSRecord } from 'aws-lambda';
import { LetterEvent } from '@nhsdigital/nhs-notify-event-schemas-supplier-api/src/events/letter-events';

export const acceptedLetterEvent = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  specversion: '1.0',
  source: '/data-plane/supplier-api/prod/update-status',
  subject:
    'letter-origin/digital-letters/letter/f47ac10b-58cc-4372-a567-0e02b2c3d479',
  type: 'uk.nhs.notify.supplier-api.letter.ACCEPTED.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/supplier-api/letter.ACCEPTED.1.0.0.schema.json',
  dataschemaversion: '1.0.0',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  severitytext: 'INFO',
  plane: 'data',
  data: {
    domainId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    groupId: 'client_template',
    origin: {
      domain: 'letter-rendering',
      event: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      source: '/data-plane/letter-rendering/prod/render-pdf',
      subject:
        'client/00f3b388-bbe9-41c9-9e76-052d37ee8988/digital-letters/b9c0c7f8-8204-400d-8348-7e7ddf775dae',
    },
    specificationId: '1y3q9v1zzzz',
    supplierId: 'supplier-1',
    status: 'ACCEPTED',
  },
} as LetterEvent;

export const dispatchedLetterEvent = {
  ...acceptedLetterEvent,
  type: 'uk.nhs.notify.supplier-api.letter.DISPATCHED.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/supplier-api/letter.DISPATCHED.1.0.0.schema.json',
  data: {
    ...acceptedLetterEvent.data,
    status: 'DISPATCHED',
  },
} as LetterEvent;

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

export const recordEvent = (events: LetterEvent[]): SQSEvent => ({
  Records: events.map((event, i) => ({
    ...sqsRecord,
    messageId: String(i + 1),
    body: JSON.stringify({ ...busEvent, detail: event }),
  })),
});
